/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect } from 'react';
import Spinner from './Spinner';
import { DownloadIcon, UpscaleIcon } from './icons';

export type GeneratedImage = {
    id: string;
    url: string;
    prompt: string;
    isUpscaled: boolean;
    createdAt: string;
};

interface GalleryScreenProps {
    images: GeneratedImage[];
    onUpscale: (image: GeneratedImage) => Promise<GeneratedImage>;
    userCredits: number;
}

const GalleryScreen: React.FC<GalleryScreenProps> = ({ images, onUpscale, userCredits }) => {
    const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);
    const [isUpscaling, setIsUpscaling] = useState(false);
    const [upscaleError, setUpscaleError] = useState<string | null>(null);
    const [currentImages, setCurrentImages] = useState(images);

    useEffect(() => {
        setCurrentImages(images);
        // If there are images but none is selected, or the selected one is no longer in the list, select the first one.
        if (images.length > 0 && (!selectedImage || !images.some(img => img.id === selectedImage.id))) {
            setSelectedImage(images[0]);
        } else if (images.length === 0) {
            setSelectedImage(null);
        }
    }, [images, selectedImage]);
    
    const handleUpscale = async () => {
        if (!selectedImage) {
            setUpscaleError('No image selected to upscale.');
            return;
        }
        
        const cost = 1;
        if (userCredits < cost) {
            setUpscaleError(`You need ${cost} credit for this action.`);
            return;
        }
        
        setIsUpscaling(true);
        setUpscaleError(null);
        
        try {
            const updatedImage = await onUpscale(selectedImage);
            setSelectedImage(updatedImage); // Update the selected image with the new data (e.g., new URL)
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            setUpscaleError(errorMessage);
        } finally {
            setIsUpscaling(false);
        }
    };

    const handleDownload = () => {
      if (selectedImage) {
          // Fetch the image and create a blob URL to bypass CORS issues with direct download of Firebase Storage URLs.
          fetch(selectedImage.url)
            .then(response => response.blob())
            .then(blob => {
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = `generated-image-${selectedImage.id}.jpeg`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(link.href);
            })
            .catch(err => {
                console.error("Failed to download image: ", err);
                setUpscaleError("Could not download the image. Please try again.");
            });
      }
    };

    if (currentImages.length === 0) {
        return (
            <div className="text-center text-gray-400 p-8 animate-fade-in">
                <h2 className="text-3xl font-bold text-gray-200 mb-4">My Gallery</h2>
                <p>You haven't generated any images yet.</p>
                <p>Go to the "Generate" tab to start creating!</p>
            </div>
        );
    }
    
    if (!selectedImage) {
        return <div className="flex justify-center items-center h-full"><Spinner /></div>;
    }

    const upscaleCost = 1;
    const canUpscale = userCredits >= upscaleCost;
    
    return (
        <div className="w-full max-w-5xl mx-auto flex flex-col items-center gap-6 animate-fade-in">
            <h2 className="text-3xl font-bold text-gray-200">My Gallery</h2>
            {/* Main Preview */}
            <div className="relative w-full max-w-2xl bg-black/20 p-2 rounded-xl">
                <img src={selectedImage.url} alt={selectedImage.prompt} className="rounded-xl shadow-2xl max-h-[60vh] object-contain mx-auto" />
                {isUpscaling && (
                    <div className="absolute inset-0 bg-black/70 z-10 flex flex-col items-center justify-center gap-4 animate-fade-in rounded-xl">
                        <Spinner size="medium" />
                        <p className="text-gray-300">Upscaling your image...</p>
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-center gap-4">
                <button
                    onClick={handleUpscale}
                    disabled={isUpscaling || selectedImage.isUpscaled || !canUpscale}
                    title={!canUpscale ? "You don't have enough credits for this action." : (selectedImage.isUpscaled ? "Image has already been upscaled" : "Upscale image")}
                    className="flex items-center justify-center gap-2 text-center bg-white/10 border border-white/20 text-gray-200 font-semibold py-3 px-6 rounded-md transition-all duration-200 ease-in-out hover:bg-white/20 hover:border-white/30 active:scale-95 text-base disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-white/5"
                >
                    {isUpscaling ? <Spinner size="small" /> : <UpscaleIcon className="w-5 h-5" />}
                    {isUpscaling ? 'Upscaling...' : (selectedImage.isUpscaled ? 'Upscaled' : `Upscale (${upscaleCost} Credit)`)}
                </button>
                <button
                    onClick={handleDownload}
                    className="flex items-center justify-center text-center bg-gradient-to-br from-green-600 to-green-500 text-white font-bold py-3 px-6 rounded-md transition-all duration-300 ease-in-out shadow-lg shadow-green-500/20 hover:shadow-xl hover:shadow-green-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner text-base"
                >
                    <DownloadIcon className="w-5 h-5 mr-2" />
                    Download
                </button>
            </div>
            {upscaleError && (
                <div className="text-center bg-red-500/10 border border-red-500/20 p-4 rounded-lg w-full mt-2">
                    <p className="text-md text-red-400">{upscaleError}</p>
                </div>
            )}
            
            {/* Thumbnail Strip */}
            <div className="w-full bg-gray-900/50 rounded-lg border border-gray-700 mt-4">
                <p className="text-sm text-gray-400 p-3 border-b border-gray-700">Prompt: <span className="text-gray-200">{selectedImage.prompt}</span></p>
                <div className="w-full overflow-x-auto p-2">
                    <div className="flex gap-2">
                        {currentImages.map(img => (
                            <button 
                                key={img.id}
                                onClick={() => setSelectedImage(img)}
                                className={`flex-shrink-0 w-24 h-24 rounded-md overflow-hidden transition-all duration-200 focus:outline-none ${selectedImage.id === img.id ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-gray-900' : 'ring-0'}`}
                            >
                                <img 
                                    src={img.url}
                                    alt="Generated thumbnail"
                                    className="w-full h-full object-cover"
                                />
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GalleryScreen;