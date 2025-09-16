/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState } from 'react';
import { UploadIcon, MagicWandIcon, EditIcon, SparkleIcon, CopyIcon } from './icons';
import { improvePrompt } from '../services/geminiService';
import Spinner from './Spinner';

interface StartScreenProps {
  onFileSelect: (files: FileList | null) => void;
  onSetMode: (mode: 'editor' | 'generator') => void;
  onStartGeneratorWithPrompt: (prompt: string) => void;
}

const StartScreen: React.FC<StartScreenProps> = ({ onFileSelect, onSetMode, onStartGeneratorWithPrompt }) => {
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  
  // State for the new prompt improver feature
  const [idea, setIdea] = useState('');
  const [improvedPrompt, setImprovedPrompt] = useState('');
  const [isImproving, setIsImproving] = useState(false);
  const [improveError, setImproveError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(e.target.files);
    }
  };

  const handleImprovePrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idea.trim()) {
      setImproveError("Please enter an idea for your prompt.");
      return;
    }
    setIsImproving(true);
    setImproveError(null);
    setImprovedPrompt('');
    try {
      const result = await improvePrompt(idea);
      setImprovedPrompt(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setImproveError(errorMessage);
    } finally {
      setIsImproving(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(improvedPrompt);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000); // Reset after 2 seconds
  };

  return (
    <div 
      className={`w-full max-w-5xl mx-auto text-center p-8 transition-all duration-300 rounded-2xl border-2 ${isDraggingOver ? 'bg-blue-500/10 border-dashed border-blue-400' : 'border-transparent'}`}
      onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true); }}
      onDragLeave={() => setIsDraggingOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDraggingOver(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          onFileSelect(e.dataTransfer.files);
        }
      }}
    >
      <div className="flex flex-col items-center gap-6 animate-fade-in">
        <h1 className="text-5xl font-extrabold tracking-tight text-gray-100 sm:text-6xl md:text-7xl">
          The Future of Image Creation & <span className="text-blue-400">Editing</span>.
        </h1>
        <p className="max-w-3xl text-lg text-gray-400 md:text-xl">
          Use the power of AI to generate stunning new images from your imagination or enhance your existing photos with professional, easy-to-use tools.
        </p>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
            {/* Option 1: Generate Image */}
            <div className="bg-black/20 p-8 rounded-lg border border-gray-700/50 flex flex-col items-center text-center">
                <MagicWandIcon className="w-12 h-12 text-blue-400 mb-4" />
                <h3 className="text-2xl font-bold text-gray-100">Generate an Image</h3>
                <p className="mt-2 text-gray-400">Turn your ideas into unique images and art with a simple text prompt.</p>
                <button
                    onClick={() => onSetMode('generator')}
                    className="mt-6 w-full relative inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white bg-blue-600 rounded-full cursor-pointer group hover:bg-blue-500 transition-colors"
                >
                    Create with AI
                </button>
            </div>
            {/* Option 2: Edit a Photo */}
            <div className="bg-black/20 p-8 rounded-lg border border-gray-700/50 flex flex-col items-center text-center">
                <EditIcon className="w-12 h-12 text-blue-400 mb-4" />
                <h3 className="text-2xl font-bold text-gray-100">Edit Your Photo</h3>
                <p className="mt-2 text-gray-400">Upload a photo to retouch, apply filters, crop, and make adjustments.</p>
                <label htmlFor="image-upload-start" className="mt-6 w-full relative inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white bg-white/10 rounded-full cursor-pointer group hover:bg-white/20 transition-colors">
                    <UploadIcon className="w-6 h-6 mr-3" />
                    Upload an Image
                </label>
                <input id="image-upload-start" type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
            </div>
        </div>
        
        {/* New Prompt Improver Section */}
        <div className="mt-8 w-full max-w-2xl bg-black/20 p-8 rounded-lg border border-gray-700/50 flex flex-col items-center text-center">
            <SparkleIcon className="w-12 h-12 text-blue-400 mb-4" />
            <h3 className="text-2xl font-bold text-gray-100">Improve a Prompt</h3>
            <p className="mt-2 text-gray-400">Have an idea? Let AI expand it into a detailed prompt for better results.</p>
            <form onSubmit={handleImprovePrompt} className="w-full mt-6 flex items-center gap-2">
                <input
                    type="text"
                    value={idea}
                    onChange={(e) => setIdea(e.target.value)}
                    placeholder="e.g., 'a cat in space'"
                    className="flex-grow bg-gray-800 border border-gray-600 text-gray-200 rounded-lg p-4 text-base focus:ring-2 focus:ring-blue-500 focus:outline-none transition w-full disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isImproving}
                />
                <button
                    type="submit"
                    className="bg-blue-600 text-white font-bold py-4 px-6 text-base rounded-lg transition-all duration-300 ease-in-out hover:bg-blue-500 active:scale-95 disabled:bg-blue-800 disabled:cursor-not-allowed flex items-center justify-center"
                    disabled={isImproving || !idea.trim()}
                >
                    {isImproving ? <Spinner size="small"/> : 'Improve'}
                </button>
            </form>

            {improveError && (
              <div className="text-center bg-red-500/10 border border-red-500/20 p-3 rounded-lg w-full mt-4">
                  <p className="text-sm text-red-400">{improveError}</p>
              </div>
            )}

            {improvedPrompt && (
              <div className="mt-6 w-full text-left bg-gray-900/50 p-4 rounded-lg border border-gray-700 animate-fade-in">
                  <p className="text-gray-300">{improvedPrompt}</p>
                  <div className="flex items-center gap-2 mt-4">
                      <button 
                          onClick={handleCopy}
                          className="flex items-center justify-center text-center bg-white/10 border border-white/20 text-gray-200 font-semibold py-2 px-4 rounded-md transition-all duration-200 ease-in-out hover:bg-white/20 active:scale-95 text-sm"
                      >
                          <CopyIcon className="w-4 h-4 mr-2" />
                          {isCopied ? 'Copied!' : 'Copy'}
                      </button>
                      <button 
                          onClick={() => onStartGeneratorWithPrompt(improvedPrompt)}
                          className="flex items-center justify-center text-center bg-blue-600 text-white font-semibold py-2 px-4 rounded-md transition-all duration-200 ease-in-out hover:bg-blue-500 active:scale-95 text-sm"
                      >
                          Use this Prompt
                          <MagicWandIcon className="w-4 h-4 ml-2" />
                      </button>
                  </div>
              </div>
            )}
        </div>

        <p className="text-sm text-gray-500 mt-4">You can also drag and drop a photo to start editing.</p>
      </div>
    </div>
  );
};

export default StartScreen;
