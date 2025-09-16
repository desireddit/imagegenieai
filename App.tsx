/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React, { useState, useCallback, useRef, useEffect } from 'react';
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop';
import { ReactCompareSlider } from 'react-compare-slider';
import { generateEditedImage, generateFilteredImage, generateAdjustedImage, upscaleImage } from './services/geminiService';
import Header from './components/Header';
import Spinner from './components/Spinner';
import FilterPanel from './components/FilterPanel';
import AdjustmentPanel from './components/AdjustmentPanel';
import CropPanel from './components/CropPanel';
import { UndoIcon, RedoIcon } from './components/icons';
import StartScreen from './components/StartScreen';
import ImageGenerator from './components/ImageGenerator';
import AuthScreen from './components/AuthScreen';
import AccountScreen from './components/AccountScreen';
import PricingScreen from './components/PricingScreen';
import BackButton from './components/BackButton';
import GalleryScreen, { GeneratedImage } from './components/GalleryScreen';
import { auth } from './firebase';
// FIX: Switched to Firebase v8 compat imports to resolve module errors.
// FIX: Changed Firebase v8 compat import from a default import to a namespace import (`import * as firebase from ...`). Added a side-effect import for `firebase/compat/auth` to ensure the `auth` namespace and its types are correctly attached to the main `firebase` object.
// FIX: Reverted incorrect namespace import to a default import for Firebase v8 compat to resolve type errors.
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import * as userService from './services/userService';


// Helper to convert a data URL string to a File object
export const dataURLtoFile = (dataurl: string, filename: string): File => {
    const arr = dataurl.split(',');
    if (arr.length < 2) throw new Error("Invalid data URL");
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch || !mimeMatch[1]) throw new Error("Could not parse MIME type from data URL");

    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while(n--){
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, {type:mime});
}

type Tab = 'promptEdit' | 'localEdit' | 'filters' | 'crop';
type AppMode = 'start' | 'editor' | 'generator' | 'account' | 'pricing' | 'gallery';
export type CreditTransaction = {
    reason: string;
    amount: number; // positive for additions, negative for deductions
    date: string; // ISO string
};

export type User = {
    uid: string;
    name: string;
    email: string;
    credits: number;
    creditHistory: CreditTransaction[];
};

const App: React.FC = () => {
  // Auth state
  // FIX: Changed type from `firebase.auth.User` to `firebase.User` to match v8 compat types.
  const [authUser, setAuthUser] = useState<firebase.User | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [appMode, setAppMode] = useState<AppMode>('start');
  const [initialGeneratorPrompt, setInitialGeneratorPrompt] = useState<string>('');
  
  // Editor-specific state
  const [history, setHistory] = useState<File[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [prompt, setPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [editHotspot, setEditHotspot] = useState<{ x: number, y: number } | null>(null);
  const [displayHotspot, setDisplayHotspot] = useState<{ x: number, y: number } | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('promptEdit');
  
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [aspect, setAspect] = useState<number | undefined>();
  const imgRef = useRef<HTMLImageElement>(null);

  // Gallery state
  const [allGeneratedImages, setAllGeneratedImages] = useState<GeneratedImage[]>([]);

  const currentImage = history[historyIndex] ?? null;
  const originalImage = history[0] ?? null;

  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);

  useEffect(() => {
    // FIX: Switched to Firebase v8 compat onAuthStateChanged method.
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user && user.emailVerified) {
        setAuthUser(user);
        const userProfile = await userService.getUserProfile(user.uid);
        if (userProfile) {
          setCurrentUser(userProfile);
          const galleryImages = await userService.getGalleryImages(user.uid);
          setAllGeneratedImages(galleryImages);
        } else {
            // This might happen if user is created in Auth but Firestore doc creation fails.
            // Or if they sign up but haven't been redirected yet.
            console.log("User is authenticated but profile data not found yet.");
        }
      } else {
        setAuthUser(null);
        setCurrentUser(null);
        setAllGeneratedImages([]);
        setHistory([]);
        setHistoryIndex(-1);
        setAppMode('start');
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Effect to create and revoke object URLs safely for the current image
  useEffect(() => {
    if (currentImage) {
      const url = URL.createObjectURL(currentImage);
      setCurrentImageUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setCurrentImageUrl(null);
    }
  }, [currentImage]);
  
  // Effect to create and revoke object URLs safely for the original image
  useEffect(() => {
    if (originalImage) {
      const url = URL.createObjectURL(originalImage);
      setOriginalImageUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setOriginalImageUrl(null);
    }
  }, [originalImage]);


  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const handleDeductCredits = useCallback(async (amount: number, reason: string): Promise<boolean> => {
    if (!currentUser) return false;
    
    if (currentUser.credits < amount) {
        setError(`You need ${amount} credits for this action, but you only have ${currentUser.credits}. Please purchase more.`);
        setAppMode('pricing');
        return false;
    }
    
    const updatedUser = await userService.updateUserCredits(currentUser.uid, -amount, reason);
    if (updatedUser) {
        setCurrentUser(updatedUser);
        return true;
    }
    return false;
  }, [currentUser]);

  const addImageToHistory = useCallback((newImageFile: File) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newImageFile);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setCrop(undefined);
    setCompletedCrop(undefined);
  }, [history, historyIndex]);

  const handleImageUpload = useCallback((file: File) => {
    setError(null);
    setHistory([file]);
    setHistoryIndex(0);
    setEditHotspot(null);
    setDisplayHotspot(null);
    setActiveTab('promptEdit');
    setCrop(undefined);
    setCompletedCrop(undefined);
    setAppMode('editor');
  }, []);

  const handleGenericEdit = useCallback(async (
      editFunction: () => Promise<string>,
      cost: number,
      reason: string,
      fileSuffix: string
  ) => {
      if (!currentImage) {
          setError('No image loaded to edit.');
          return;
      }
      if (!await handleDeductCredits(cost, reason)) {
          return; 
      }

      setIsLoading(true);
      setError(null);
      
      try {
          const resultUrl = await editFunction();
          const newImageFile = dataURLtoFile(resultUrl, `${fileSuffix}-${Date.now()}.png`);
          addImageToHistory(newImageFile);
          return true; 
      } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
          setError(`Failed to ${reason.toLowerCase()}. ${errorMessage}`);
          console.error(err);
          // Re-add credits on failure
          const refundedUser = await userService.updateUserCredits(currentUser!.uid, cost, `Refund: ${reason}`);
          if (refundedUser) setCurrentUser(refundedUser);
          return false;
      } finally {
          setIsLoading(false);
      }
  }, [currentImage, addImageToHistory, handleDeductCredits, currentUser]);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim() || !editHotspot) {
      setError(!prompt.trim() ? 'Please enter a prompt.' : 'Please select an area on the image.');
      return;
    }
    const success = await handleGenericEdit(
        () => generateEditedImage(currentImage!, prompt, editHotspot),
        2,
        'AI Local Edit',
        'edited'
    );
    if (success) {
      setEditHotspot(null);
      setDisplayHotspot(null);
    }
  }, [currentImage, prompt, editHotspot, handleGenericEdit]);

  const handleApplyFilter = useCallback(async (filterPrompt: string) => {
      await handleGenericEdit(
          () => generateFilteredImage(currentImage!, filterPrompt),
          2,
          'AI Filter',
          'filtered'
      );
  }, [currentImage, handleGenericEdit]);

  const handleApplyAdjustment = useCallback(async (adjustmentPrompt: string) => {
      await handleGenericEdit(
          () => generateAdjustedImage(currentImage!, adjustmentPrompt),
          2,
          'AI Prompt Edit',
          'adjusted'
      );
  }, [currentImage, handleGenericEdit]);
  
  const handleApplyCrop = useCallback(() => {
    if (!completedCrop || !imgRef.current) {
        setError('Please select an area to crop.');
        return;
    }

    const image = imgRef.current;
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    
    canvas.width = completedCrop.width;
    canvas.height = completedCrop.height;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        setError('Could not process the crop.');
        return;
    }

    const pixelRatio = window.devicePixelRatio || 1;
    canvas.width = completedCrop.width * pixelRatio;
    canvas.height = completedCrop.height * pixelRatio;
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      completedCrop.width,
      completedCrop.height,
    );
    
    const croppedImageUrl = canvas.toDataURL('image/png');
    const newImageFile = dataURLtoFile(croppedImageUrl, `cropped-${Date.now()}.png`);
    addImageToHistory(newImageFile);

  }, [completedCrop, addImageToHistory]);

  const handleUndo = useCallback(() => {
    if (canUndo) {
      setHistoryIndex(historyIndex - 1);
      setEditHotspot(null);
      setDisplayHotspot(null);
    }
  }, [canUndo, historyIndex]);
  
  const handleRedo = useCallback(() => {
    if (canRedo) {
      setHistoryIndex(historyIndex + 1);
      setEditHotspot(null);
      setDisplayHotspot(null);
    }
  }, [canRedo, historyIndex]);

  const handleReset = useCallback(() => {
    if (history.length > 0) {
      setHistoryIndex(0);
      setError(null);
      setEditHotspot(null);
      setDisplayHotspot(null);
    }
  }, [history]);

  const handleGoHome = useCallback(() => {
      if (!currentUser) return;
      setHistory([]);
      setHistoryIndex(-1);
      setError(null);
      setPrompt('');
      setEditHotspot(null);
      setDisplayHotspot(null);
      setAppMode('start');
  }, [currentUser]);

  const handleDownload = useCallback(() => {
      if (currentImage) {
          const link = document.createElement('a');
          link.href = URL.createObjectURL(currentImage);
          link.download = `edited-${currentImage.name}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(link.href);
      }
  }, [currentImage]);
  
  const handleFileSelect = (files: FileList | null) => {
    if (files && files[0]) {
      handleImageUpload(files[0]);
    }
  };

  const handleStartGeneratorWithPrompt = useCallback((prompt: string) => {
    setInitialGeneratorPrompt(prompt);
    setAppMode('generator');
  }, []);

  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (activeTab !== 'localEdit') return;
    
    const img = e.currentTarget;
    const rect = img.getBoundingClientRect();

    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    
    setDisplayHotspot({ x: offsetX, y: offsetY });

    const { naturalWidth, naturalHeight, clientWidth, clientHeight } = img;
    const scaleX = naturalWidth / clientWidth;
    const scaleY = naturalHeight / clientHeight;

    const originalX = Math.round(offsetX * scaleX);
    const originalY = Math.round(offsetY * scaleY);

    setEditHotspot({ x: originalX, y: originalY });
  };

  const handleLogout = useCallback(async () => {
      try {
        // FIX: Switched to Firebase v8 compat signOut method.
        await auth.signOut();
        // onAuthStateChanged will handle state cleanup
      } catch (error) {
          console.error("Error signing out: ", error);
          setError("Failed to sign out.");
      }
  }, []);
  
  const handleUpdateUser = async (updatedData: Partial<User>) => {
      if (!currentUser) return;
      const updatedUser = await userService.updateUserProfile(currentUser.uid, updatedData);
      if (updatedUser) {
          setCurrentUser(updatedUser);
      }
  };

  const handlePurchaseCredits = async (creditAmount: number, reason: string) => {
    if (!currentUser) return;
    const updatedUser = await userService.updateUserCredits(currentUser.uid, creditAmount, reason);
    if (updatedUser) {
        setCurrentUser(updatedUser);
        setAppMode('start'); // Go home after purchase
    }
  };

  const handleImageGenerated = async (imageDataUrl: string, generationPrompt: string) => {
    if (!currentUser) return;
    setIsLoading(true); // Use a global loader maybe?
    try {
        const imageFile = dataURLtoFile(imageDataUrl, `generated-${Date.now()}.jpeg`);
        const downloadUrl = await userService.uploadImage(currentUser.uid, imageFile);
        
        const newImageData: Omit<GeneratedImage, 'id'> = {
            url: downloadUrl,
            prompt: generationPrompt,
            isUpscaled: false,
            createdAt: new Date().toISOString()
        };
        const newImageWithId = await userService.addImageToGallery(currentUser.uid, newImageData);
        setAllGeneratedImages(prev => [newImageWithId, ...prev]);
        setAppMode('gallery');
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`Failed to save generated image. ${errorMessage}`);
    } finally {
        setIsLoading(false);
    }
  };
  
  const handleUpscaleImage = async (image: GeneratedImage) => {
      if (!currentUser) return;
      
      const cost = 1;
      if (!await handleDeductCredits(cost, `Upscale: ${image.id}`)) {
          return;
      }

      try {
        const upscaledUrl = await upscaleImage(image.url);
        const upscaledFile = dataURLtoFile(upscaledUrl, `upscaled-${image.id}.jpeg`);
        const newDownloadUrl = await userService.uploadImage(currentUser.uid, upscaledFile, `upscaled-${image.id}.jpeg`);

        const updatedImage = await userService.updateGalleryImage(currentUser.uid, image.id, {
            url: newDownloadUrl,
            isUpscaled: true
        });

        setAllGeneratedImages(prev => prev.map(img => img.id === image.id ? updatedImage : img));
        return updatedImage;

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`Failed to upscale image. ${errorMessage}`);
        // Refund credits on failure
        const refundedUser = await userService.updateUserCredits(currentUser.uid, cost, `Refund: Upscale ${image.id}`);
        if (refundedUser) setCurrentUser(refundedUser);
        return image; // return original
      }
  };

  const renderEditor = () => {
    if (error && appMode !== 'pricing') {
       return (
           <div className="text-center animate-fade-in bg-red-500/10 border border-red-500/20 p-8 rounded-lg max-w-2xl mx-auto flex flex-col items-center gap-4">
            <h2 className="text-2xl font-bold text-red-300">An Error Occurred</h2>
            <p className="text-md text-red-400">{error}</p>
            <button
                onClick={() => {
                  setError(null);
                  if (appMode !== 'editor') setAppMode('start');
                }}
                className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-6 rounded-lg text-md transition-colors"
              >
                Dismiss
            </button>
          </div>
        );
    }
    
    if (!currentImageUrl) {
      return <StartScreen onFileSelect={handleFileSelect} onSetMode={setAppMode} onStartGeneratorWithPrompt={handleStartGeneratorWithPrompt} />;
    }

    const imageDisplay = (canUndo && originalImageUrl && currentImageUrl) ? (
        <ReactCompareSlider
            itemOne={<img src={originalImageUrl} alt="Original" className="w-full h-auto object-contain max-h-[60vh] rounded-xl" />}
            itemTwo={
                <img 
                    src={currentImageUrl} 
                    alt="Current" 
                    onClick={handleImageClick} 
                    className={`w-full h-auto object-contain max-h-[60vh] rounded-xl ${activeTab === 'localEdit' ? 'cursor-crosshair' : ''}`}
                />
            }
            className="max-h-[60vh] rounded-xl"
        />
    ) : (
        currentImageUrl && <img
            ref={imgRef}
            src={currentImageUrl}
            alt="Current"
            onClick={handleImageClick}
            className={`w-full h-auto object-contain max-h-[60vh] rounded-xl ${activeTab === 'localEdit' ? 'cursor-crosshair' : ''}`}
        />
    );
    
    const cropImageElement = (
      <img 
        ref={imgRef}
        key={`crop-${currentImageUrl}`}
        src={currentImageUrl} 
        alt="Crop this image"
        className="w-full h-auto object-contain max-h-[60vh] rounded-xl"
      />
    );


    return (
      <div className="w-full max-w-4xl mx-auto flex flex-col items-center gap-6 animate-fade-in">
        <div className="relative w-full shadow-2xl rounded-xl overflow-hidden bg-black/20">
            {activeTab === 'crop' ? (
              <ReactCrop 
                crop={crop} 
                onChange={c => setCrop(c)} 
                onComplete={c => setCompletedCrop(c)}
                aspect={aspect}
                className="max-h-[60vh]"
              >
                {cropImageElement}
              </ReactCrop>
            ) : imageDisplay }

            {displayHotspot && !isLoading && activeTab === 'localEdit' && (
                <div 
                    className="absolute rounded-full w-6 h-6 bg-blue-500/50 border-2 border-white pointer-events-none -translate-x-1/2 -translate-y-1/2 z-10"
                    style={{ left: `${displayHotspot.x}px`, top: `${displayHotspot.y}px` }}
                >
                    <div className="absolute inset-0 rounded-full w-6 h-6 animate-ping bg-blue-400"></div>
                </div>
            )}
        </div>
        
        <div className="w-full bg-gray-800/80 border border-gray-700/80 rounded-lg p-2 flex items-center justify-center gap-2 backdrop-blur-sm">
            {(['promptEdit', 'localEdit', 'filters', 'crop'] as Tab[]).map(tab => (
                 <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`w-full capitalize font-semibold py-3 px-5 rounded-md transition-all duration-200 text-base ${
                        activeTab === tab 
                        ? 'bg-gradient-to-br from-blue-500 to-cyan-400 text-white shadow-lg shadow-cyan-500/40' 
                        : 'text-gray-300 hover:text-white hover:bg-white/10'
                    }`}
                >
                    {tab.replace('Edit', ' Edit')}
                </button>
            ))}
        </div>
        
        <div className="w-full">
            {activeTab === 'localEdit' && (
                <div className="flex flex-col items-center gap-4">
                    <p className="text-md text-gray-400">
                        {editHotspot ? 'Great! Now describe your localized edit below.' : 'Click an area on the image to make a precise edit.'}
                    </p>
                    <form onSubmit={(e) => { e.preventDefault(); handleGenerate(); }} className="w-full flex items-center gap-2">
                        <input
                            type="text"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder={editHotspot ? "e.g., 'change my shirt color to blue'" : "First click a point on the image"}
                            className="flex-grow bg-gray-800 border border-gray-700 text-gray-200 rounded-lg p-5 text-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition w-full disabled:cursor-not-allowed disabled:opacity-60"
                            disabled={isLoading || !editHotspot}
                        />
                        <button 
                            type="submit"
                            className="bg-gradient-to-br from-blue-600 to-blue-500 text-white font-bold py-5 px-8 text-lg rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner disabled:from-blue-800 disabled:to-blue-700 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
                            disabled={isLoading || !prompt.trim() || !editHotspot}
                        >
                            {isLoading ? (
                                <>
                                    <Spinner size="small" />
                                    <span>Generating...</span>
                                </>
                            ) : (
                                'Generate (2 Credits)'
                            )}
                        </button>
                    </form>
                </div>
            )}
            {activeTab === 'crop' && <CropPanel onApplyCrop={handleApplyCrop} onSetAspect={setAspect} isLoading={isLoading} isCropping={!!completedCrop?.width && completedCrop.width > 0} />}
            {activeTab === 'promptEdit' && <AdjustmentPanel onApplyAdjustment={handleApplyAdjustment} isLoading={isLoading} userCredits={currentUser?.credits ?? 0} />}
            {activeTab === 'filters' && <FilterPanel onApplyFilter={handleApplyFilter} isLoading={isLoading} userCredits={currentUser?.credits ?? 0} />}
        </div>
        
        <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
            <button 
                onClick={handleUndo}
                disabled={!canUndo}
                className="flex items-center justify-center text-center bg-white/10 border border-white/20 text-gray-200 font-semibold py-3 px-5 rounded-md transition-all duration-200 ease-in-out hover:bg-white/20 hover:border-white/30 active:scale-95 text-base disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-white/5"
                aria-label="Undo last action"
            >
                <UndoIcon className="w-5 h-5 mr-2" />
                Undo
            </button>
            <button 
                onClick={handleRedo}
                disabled={!canRedo}
                className="flex items-center justify-center text-center bg-white/10 border border-white/20 text-gray-200 font-semibold py-3 px-5 rounded-md transition-all duration-200 ease-in-out hover:bg-white/20 hover:border-white/30 active:scale-95 text-base disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-white/5"
                aria-label="Redo last action"
            >
                <RedoIcon className="w-5 h-5 mr-2" />
                Redo
            </button>
            
            <div className="h-6 w-px bg-gray-600 mx-1 hidden sm:block"></div>

            <button 
                onClick={handleReset}
                disabled={!canUndo}
                className="text-center bg-transparent border border-white/20 text-gray-200 font-semibold py-3 px-5 rounded-md transition-all duration-200 ease-in-out hover:bg-white/10 hover:border-white/30 active:scale-95 text-base disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-transparent"
              >
                Reset
            </button>
            <button 
                onClick={handleGoHome}
                className="text-center bg-white/10 border border-white/20 text-gray-200 font-semibold py-3 px-5 rounded-md transition-all duration-200 ease-in-out hover:bg-white/20 hover:border-white/30 active:scale-95 text-base"
            >
                Upload New
            </button>

            <button 
                onClick={handleDownload}
                className="flex-grow sm:flex-grow-0 ml-auto bg-gradient-to-br from-green-600 to-green-500 text-white font-bold py-3 px-5 rounded-md transition-all duration-300 ease-in-out shadow-lg shadow-green-500/20 hover:shadow-xl hover:shadow-green-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner text-base"
            >
                Download Image
            </button>
        </div>
      </div>
    );
  };
  
  const renderContent = () => {
    if (authLoading) {
      return <div className="flex justify-center items-center h-full"><Spinner /></div>;
    }

    if (!currentUser) {
      return <AuthScreen />;
    }
    
    // Render error overlay if there is one, except when on the pricing page from a credit error
    if (error && appMode !== 'pricing') {
       return (
           <div className="text-center animate-fade-in bg-red-500/10 border border-red-500/20 p-8 rounded-lg max-w-2xl mx-auto flex flex-col items-center gap-4">
            <h2 className="text-2xl font-bold text-red-300">An Error Occurred</h2>
            <p className="text-md text-red-400">{error}</p>
            <button
                onClick={() => {
                  setError(null);
                  if (appMode !== 'editor') setAppMode('start');
                }}
                className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-6 rounded-lg text-md transition-colors"
              >
                Dismiss
            </button>
          </div>
        );
    }
    
    switch (appMode) {
      case 'generator':
        return <ImageGenerator 
          initialPrompt={initialGeneratorPrompt} 
          onDone={() => setInitialGeneratorPrompt('')}
          userCredits={currentUser?.credits ?? 0}
          onDeductCredits={handleDeductCredits}
          onImageGenerated={handleImageGenerated}
        />;
      case 'editor':
        return renderEditor();
      case 'account':
        return <AccountScreen user={currentUser!} onUpdateUser={handleUpdateUser} />;
      case 'pricing':
        return <PricingScreen onPurchase={handlePurchaseCredits} currentUser={currentUser} />;
      case 'gallery':
        return <GalleryScreen 
            images={allGeneratedImages} 
            onUpscale={handleUpscaleImage}
            userCredits={currentUser.credits}
        />;
      case 'start':
      default:
        return <StartScreen onFileSelect={handleFileSelect} onSetMode={setAppMode} onStartGeneratorWithPrompt={handleStartGeneratorWithPrompt} />;
    }
  };

  const isAuthenticated = !!currentUser;

  return (
    <div className="min-h-screen text-gray-100 flex flex-col">
      <Header
        onLogoClick={handleGoHome}
        isAuthenticated={isAuthenticated}
        userName={currentUser?.name}
        userCredits={currentUser?.credits}
        onLogout={handleLogout}
        onAccountClick={() => setAppMode('account')}
        onPricingClick={() => setAppMode('pricing')}
        onGalleryClick={() => setAppMode('gallery')}
        hasGalleryItems={allGeneratedImages.length > 0}
      />
      <main className={`flex-grow w-full max-w-[1600px] mx-auto p-4 md:p-8 flex flex-col justify-start`}>
        {isAuthenticated && appMode !== 'start' && appMode !== 'editor' && (
            <BackButton onClick={() => setAppMode('start')} />
        )}
        <div className={`w-full h-full flex justify-center ${!isAuthenticated || appMode === 'start' || appMode === 'account' || appMode === 'pricing' ? 'items-center' : 'items-start'}`}>
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default App;
