/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

// Re-added Modality, HarmCategory, and HarmBlockThreshold to configure model behavior correctly.
import { GoogleGenAI, GenerateContentResponse, Modality, HarmCategory, HarmBlockThreshold } from "@google/genai";

// Helper function to convert a File object to a Gemini API Part
const fileToPart = async (file: File): Promise<{ inlineData: { mimeType: string; data: string; } }> => {
    const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
    
    const arr = dataUrl.split(',');
    if (arr.length < 2) throw new Error("Invalid data URL");
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch || !mimeMatch[1]) throw new Error("Could not parse MIME type from data URL");
    
    const mimeType = mimeMatch[1];
    const data = arr[1];
    return { inlineData: { mimeType, data } };
};

// Helper function to convert a data URL string to a Gemini API Part
const dataUrlToPart = (dataUrl: string): { inlineData: { mimeType: string; data: string; } } => {
    const arr = dataUrl.split(',');
    if (arr.length < 2) throw new Error("Invalid data URL");
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch || !mimeMatch[1]) throw new Error("Could not parse MIME type from data URL");
    
    const mimeType = mimeMatch[1];
    const data = arr[1];
    return { inlineData: { mimeType, data } };
};

// Define safety settings to be less restrictive, blocking only nudity as requested.
const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
];

const handleApiResponse = (
    response: GenerateContentResponse,
    context: string // e.g., "edit", "filter", "adjustment"
): string => {
    // 1. Check for prompt blocking first
    if (response.promptFeedback?.blockReason) {
        const { blockReason, blockReasonMessage } = response.promptFeedback;
        const errorMessage = `Request was blocked. Reason: ${blockReason}. ${blockReasonMessage || ''}`;
        console.error(errorMessage, { response });
        throw new Error(errorMessage);
    }

    // 2. Try to find the image part
    const imagePartFromResponse = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);

    if (imagePartFromResponse?.inlineData) {
        const { mimeType, data } = imagePartFromResponse.inlineData;
        console.log(`Received image data (${mimeType}) for ${context}`);
        return `data:${mimeType};base64,${data}`;
    }

    // 3. If no image, check for other reasons
    const finishReason = response.candidates?.[0]?.finishReason;
    if (finishReason && finishReason !== 'STOP') {
        const errorMessage = `Image generation for ${context} stopped unexpectedly. Reason: ${finishReason}. This often relates to safety settings.`;
        console.error(errorMessage, { response });
        throw new Error(errorMessage);
    }
    
    const textFeedback = response.text?.trim();
    const errorMessage = `The AI model did not return an image for the ${context}. ` + 
        (textFeedback 
            ? `The model responded with text: "${textFeedback}"`
            : "This can happen due to safety filters or if the request is too complex. Please try rephrasing your prompt to be more direct.");

    console.error(`Model response did not contain an image part for ${context}.`, { response });
    throw new Error(errorMessage);
};

/**
 * Generates an image from a text prompt using the Imagen model.
 * @param prompt The text prompt describing the desired image.
 * @param aspectRatio The desired aspect ratio for the image.
 * @returns A promise that resolves to the data URL of the generated image.
 */
export const generateImage = async (
    prompt: string,
    aspectRatio: '1:1' | '16:9' | '9:16' | '4:3' | '3:4'
): Promise<string> => {
    console.log(`Starting image generation with prompt: "${prompt}" and aspect ratio: ${aspectRatio}`);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

    try {
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: prompt,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/jpeg',
                aspectRatio: aspectRatio,
                // FIX: Removed 'safetySettings' as it's not a valid property in 'GenerateImagesConfig'.
            },
        });
        console.log('Received response from image generation model.', response);

        if (response.generatedImages && response.generatedImages.length > 0) {
            const base64ImageBytes = response.generatedImages[0].image.imageBytes;
            if (base64ImageBytes) {
                return `data:image/jpeg;base64,${base64ImageBytes}`;
            }
        }
        
        // Handle cases where no image is returned but no error was thrown
        const errorMessage = "The AI model did not return an image. This might be due to safety filters or an issue with the prompt. Please try a different prompt.";
        console.error(errorMessage, { response });
        throw new Error(errorMessage);

    } catch (err) {
        console.error("Error during image generation API call:", err);
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred during image generation.';
        // Re-throw a more user-friendly error
        throw new Error(`Failed to generate image. ${errorMessage}`);
    }
};

/**
 * Improves a user's basic prompt into a more detailed one for image generation.
 * @param originalPrompt The user's basic idea.
 * @returns A promise that resolves to the improved prompt string.
 */
export const improvePrompt = async (originalPrompt: string): Promise<string> => {
    console.log(`Improving prompt: "${originalPrompt}"`);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

    const systemInstruction = `You are an expert prompt engineer for a text-to-image AI model. Your task is to take a user's simple idea and expand it into a rich, detailed, and descriptive prompt. 
    - Add details about the subject, the scene, the lighting (e.g., 'cinematic lighting', 'golden hour'), the style (e.g., 'photorealistic', 'digital art', 'anime style'), and camera details (e.g., 'wide-angle shot', 'macro photo').
    - Structure the output as a comma-separated list of keywords and phrases.
    - Do not add any introductory text or explanation. Only return the improved prompt itself.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `User idea: "${originalPrompt}"`,
            config: {
                systemInstruction: systemInstruction,
                temperature: 0.8,
                // FIX: Moved 'safetySettings' into the 'config' object to match the 'GenerateContentParameters' type.
                safetySettings: safetySettings,
            },
        });
        
        const improvedText = response.text.trim();
        if (!improvedText) {
            throw new Error("The AI model did not return an improved prompt.");
        }
        return improvedText;

    } catch (err) {
        console.error("Error during prompt improvement API call:", err);
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred during prompt improvement.';
        throw new Error(`Failed to improve prompt. ${errorMessage}`);
    }
};

/**
 * Upscales an image to a higher resolution using generative AI.
 * @param originalImageUrl The data URL of the image to upscale.
 * @returns A promise that resolves to the data URL of the upscaled image.
 */
export const upscaleImage = async (originalImageUrl: string): Promise<string> => {
    console.log('Starting image upscale.');
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

    const originalImagePart = dataUrlToPart(originalImageUrl);
    const prompt = `You are an expert photo editor AI specializing in image enhancement. 
Your task is to upscale the provided image, significantly increasing its resolution and clarity.

Instructions:
- Enhance the details and sharpness to create a high-resolution, 4k quality result.
- Do not add, remove, or change any content or elements within the image.
- The final output must be a photorealistic, higher-resolution version of the original.

Output: Return ONLY the final upscaled image. Do not return text.`;
    const textPart = { text: prompt };

    try {
        console.log('Sending image and upscale prompt to the model...');
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image-preview',
            contents: { parts: [originalImagePart, textPart] },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
                // FIX: Moved 'safetySettings' into the 'config' object to match the 'GenerateContentParameters' type.
                safetySettings: safetySettings,
            },
        });
        console.log('Received response from model for upscale.', response);

        return handleApiResponse(response, 'upscale');
    } catch (err) {
        console.error("Error during image upscaling API call:", err);
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred during image upscaling.';
        throw new Error(`Failed to upscale image. ${errorMessage}`);
    }
};


/**
 * Generates an edited image using generative AI based on a text prompt and a specific point.
 * @param originalImage The original image file.
 * @param userPrompt The text prompt describing the desired edit.
 * @param hotspot The {x, y} coordinates on the image to focus the edit.
 * @returns A promise that resolves to the data URL of the edited image.
 */
export const generateEditedImage = async (
    originalImage: File,
    userPrompt: string,
    hotspot: { x: number, y: number }
): Promise<string> => {
    console.log('Starting generative edit at:', hotspot);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    
    const originalImagePart = await fileToPart(originalImage);
    const prompt = `You are an expert photo editor AI. Your task is to perform a natural, localized edit on the provided image based on the user's request.
User Request: "${userPrompt}"
Edit Location: Focus on the area around pixel coordinates (x: ${hotspot.x}, y: ${hotspot.y}).

Editing Guidelines:
- The edit must be realistic and blend seamlessly with the surrounding area.
- The rest of the image (outside the immediate edit area) must remain identical to the original.

Output: Return ONLY the final edited image. Do not return text.`;
    const textPart = { text: prompt };

    console.log('Sending image and prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [originalImagePart, textPart] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
            // FIX: Moved 'safetySettings' into the 'config' object to match the 'GenerateContentParameters' type.
            safetySettings: safetySettings,
        },
    });
    console.log('Received response from model.', response);

    return handleApiResponse(response, 'edit');
};

/**
 * Generates an image with a filter applied using generative AI.
 * @param originalImage The original image file.
 * @param filterPrompt The text prompt describing the desired filter.
 * @returns A promise that resolves to the data URL of the filtered image.
 */
export const generateFilteredImage = async (
    originalImage: File,
    filterPrompt: string,
): Promise<string> => {
    console.log(`Starting filter generation: ${filterPrompt}`);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    
    const originalImagePart = await fileToPart(originalImage);
    const prompt = `You are an expert photo editor AI. Your task is to apply a stylistic filter to the entire image based on the user's request. Do not change the composition or content, only apply the style.
Filter Request: "${filterPrompt}"

Output: Return ONLY the final filtered image. Do not return text.`;
    const textPart = { text: prompt };

    console.log('Sending image and filter prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [originalImagePart, textPart] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
            // FIX: Moved 'safetySettings' into the 'config' object to match the 'GenerateContentParameters' type.
            safetySettings: safetySettings,
        },
    });
    console.log('Received response from model for filter.', response);
    
    return handleApiResponse(response, 'filter');
};

/**
 * Generates an image with a global adjustment applied using generative AI.
 * @param originalImage The original image file.
 * @param adjustmentPrompt The text prompt describing the desired adjustment.
 * @returns A promise that resolves to the data URL of the adjusted image.
 */
export const generateAdjustedImage = async (
    originalImage: File,
    adjustmentPrompt: string,
): Promise<string> => {
    console.log(`Starting global adjustment generation: ${adjustmentPrompt}`);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    
    const originalImagePart = await fileToPart(originalImage);
    const prompt = `You are an expert photo editor AI. Your task is to perform a natural, global adjustment to the entire image based on the user's request.
User Request: "${adjustmentPrompt}"

Editing Guidelines:
- The adjustment must be applied across the entire image.
- The result must be photorealistic.

Output: Return ONLY the final adjusted image. Do not return text.`;
    const textPart = { text: prompt };

    console.log('Sending image and adjustment prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [originalImagePart, textPart] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
            // FIX: Moved 'safetySettings' into the 'config' object to match the 'GenerateContentParameters' type.
            safetySettings: safetySettings,
        },
    });
    console.log('Received response from model for adjustment.', response);
    
    return handleApiResponse(response, 'adjustment');
};