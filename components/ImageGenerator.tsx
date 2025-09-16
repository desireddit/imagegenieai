/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect } from 'react';
import { generateImage, improvePrompt } from '../services/geminiService';
import Spinner from './Spinner';
import { SparkleIcon, CloseIcon } from './icons';

type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4';

interface ImageGeneratorProps {
    initialPrompt?: string;
    onDone?: () => void;
    userCredits: number;
    onDeductCredits: (amount: number, reason: string) => Promise<boolean>;
    onImageGenerated: (dataUrl: string, prompt: string) => void;
}


const ImageGenerator: React.FC<ImageGeneratorProps> = ({ 
    initialPrompt, 
    onDone, 
    userCredits, 
    onDeductCredits,
    onImageGenerated,
}) => {
    
    // Form state
    const [prompt, setPrompt] = useState('');
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    // Prompt improvement state
    const [isImprovingPrompt, setIsImprovingPrompt] = useState(false);
    const [improveError, setImproveError] = useState<string | null>(null);
    const [enhancedPrompt, setEnhancedPrompt] = useState<string | null>(null);

    useEffect(() => {
        if (initialPrompt) {
            setPrompt(initialPrompt);
            if (onDone) {
                onDone();
            }
        }
    }, [initialPrompt, onDone]);

    const handleGenerate = async () => {
        if (!prompt.trim()) {
            setError('Please enter a prompt to generate an image.');
            return;
        }
        
        const cost = 2;
        if (!await onDeductCredits(cost, 'Image Generation')) {
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const imageUrl = await generateImage(prompt, aspectRatio);
            onImageGenerated(imageUrl, prompt);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            setError(errorMessage);
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleImprovePrompt = async () => {
        if (!prompt.trim()) {
            setImproveError("Please enter a prompt to improve.");
            return;
        }
        setIsImprovingPrompt(true);
        setImproveError(null);
        setEnhancedPrompt(null);
        try {
            const result = await improvePrompt(prompt);
            setEnhancedPrompt(result);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            setImproveError(errorMessage);
        } finally {
            setIsImprovingPrompt(false);
        }
    };

    const aspectRatios: { name: string, value: AspectRatio }[] = [
        { name: 'Square', value: '1:1' },
        { name: 'Portrait', value: '3:4' },
        { name: 'Widescreen', value: '16:9' },
        { name: 'Tall', value: '9:16' },
        { name: 'Landscape', value: '4:3' },
    ];

    const stylePresets = [
        { name: 'Cinematic', prompt: 'cinematic lighting, dramatic, photorealistic, 4k' },
        { name: 'Anime', prompt: 'vibrant anime style, cel-shaded, detailed background' },
        { name: 'Fantasy Art', prompt: 'digital painting, fantasy, intricate, epic, concept art' },
        { name: 'Isometric', prompt: 'isometric 3D, cute, low-poly, detailed' },
        { name: 'Pixel Art', prompt: '16-bit pixel art, retro gaming style, vibrant palette' },
    ];

    const handlePresetClick = (presetPrompt: string) => {
        setPrompt(currentPrompt => {
            const trimmedCurrent = currentPrompt.trim();
            if (!trimmedCurrent) {
                return presetPrompt;
            }
            if (trimmedCurrent.endsWith(',')) {
                return `${trimmedCurrent} ${presetPrompt}`;
            }
            return `${trimmedCurrent}, ${presetPrompt}`;
        });
    };
    
    const generateCost = 2;
    const canGenerate = userCredits >= generateCost;

    return (
        <div className="w-full max-w-2xl mx-auto flex flex-col items-center gap-6 animate-fade-in">
             <h2 className="text-3xl font-bold text-gray-200">Image Generation</h2>
            <p className="text-md text-gray-400 text-center -mt-2">Describe the image you want to create. Be as detailed as you like.</p>
            
            <div className="w-full bg-gray-800/80 border border-gray-700/80 rounded-lg p-6 flex flex-col gap-5 backdrop-blur-sm">
                <div className="relative w-full">
                    <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="e.g., A photo of a raccoon astronaut..."
                        className="flex-grow bg-gray-900 border border-gray-600 text-gray-200 rounded-lg p-4 pr-10 text-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition w-full min-h-[120px]"
                        disabled={isLoading || isImprovingPrompt}
                    />
                    {prompt && (
                        <button
                            onClick={() => setPrompt('')}
                            className="absolute top-3 right-3 text-gray-500 hover:text-gray-200 transition-colors"
                            aria-label="Clear prompt"
                        >
                            <CloseIcon className="w-5 h-5" />
                        </button>
                    )}
                </div>

                <div className="flex justify-between items-center -mt-2">
                    <button
                        onClick={handleImprovePrompt}
                        disabled={!prompt.trim() || isLoading || isImprovingPrompt}
                        className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors"
                    >
                        {isImprovingPrompt ? <Spinner size="tiny" /> : <SparkleIcon className="w-4 h-4" />}
                        {isImprovingPrompt ? 'Improving...' : 'Improve with AI'}
                    </button>
                    <span className="text-xs text-gray-500">{prompt.length} / 1000</span>
                </div>
                
                {improveError && (
                  <div className="text-center bg-red-500/10 border border-red-500/20 p-2 rounded-lg">
                      <p className="text-sm text-red-400">{improveError}</p>
                  </div>
                )}
                
                {enhancedPrompt && (
                  <div className="w-full text-left bg-gray-900/50 p-4 rounded-lg border border-gray-700 animate-fade-in">
                      <p className="text-sm font-semibold text-gray-300 mb-2">AI Suggestion:</p>
                      <p className="text-gray-300 text-sm">{enhancedPrompt}</p>
                      <div className="flex items-center gap-2 mt-3">
                          <button
                              onClick={() => { setPrompt(enhancedPrompt); setEnhancedPrompt(null); }}
                              className="text-center bg-blue-600 text-white font-semibold py-1.5 px-3 rounded-md transition-all duration-200 ease-in-out hover:bg-blue-500 active:scale-95 text-xs"
                          >
                              Use this Prompt
                          </button>
                          <button
                              onClick={() => setEnhancedPrompt(null)}
                              className="text-center bg-white/10 border border-white/20 text-gray-200 font-semibold py-1.5 px-3 rounded-md transition-all duration-200 ease-in-out hover:bg-white/20 active:scale-95 text-xs"
                          >
                              Dismiss
                          </button>
                      </div>
                  </div>
                )}
                
                <div className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-gray-400">Style Presets:</span>
                    <div className="flex flex-wrap items-center gap-2">
                        {stylePresets.map(({ name, prompt: presetPrompt }) => (
                            <button
                                key={name}
                                onClick={() => handlePresetClick(presetPrompt)}
                                disabled={isLoading}
                                className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 active:scale-95 disabled:opacity-50 bg-white/10 hover:bg-white/20 text-gray-200"
                                title={`Add style: "${presetPrompt}"`}
                            >
                                {name}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex flex-col gap-2">
                    <label htmlFor="aspect-ratio-select" className="text-sm font-medium text-gray-400">Aspect Ratio:</label>
                    <select
                        id="aspect-ratio-select"
                        value={aspectRatio}
                        onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
                        disabled={isLoading}
                        className="w-full bg-gray-900 border border-gray-600 text-gray-200 rounded-lg p-3 text-base focus:ring-2 focus:ring-blue-500 focus:outline-none transition disabled:opacity-50 appearance-none"
                        style={{ 
                            backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%239ca3af' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                            backgroundPosition: 'right 0.5rem center',
                            backgroundRepeat: 'no-repeat',
                            backgroundSize: '1.5em 1.5em',
                            paddingRight: '2.5rem',
                         }}
                    >
                        {aspectRatios.map(({ name, value }) => (
                            <option key={value} value={value}>
                                {name} ({value})
                            </option>
                        ))}
                    </select>
                </div>
            </div>
            
            {error && (
                <div className="text-center bg-red-500/10 border border-red-500/20 p-4 rounded-lg w-full">
                    <p className="text-md text-red-400">{error}</p>
                </div>
            )}

            <button 
                onClick={handleGenerate}
                className="w-full bg-gradient-to-br from-blue-600 to-blue-500 text-white font-bold py-5 px-8 text-lg rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner disabled:from-gray-600 disabled:to-gray-500 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
                disabled={isLoading || !prompt.trim() || !canGenerate}
                title={!canGenerate ? "You don't have enough credits for this action." : ""}
            >
                {isLoading ? (
                    <>
                        <Spinner size="small" />
                        <span>Generating...</span>
                    </>
                ) : (
                    `Generate (${generateCost} Credits)`
                )}
            </button>
        </div>
    );
};

export default ImageGenerator;