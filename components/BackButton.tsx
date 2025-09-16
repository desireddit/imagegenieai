/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';
import { ArrowLeftIcon } from './icons';

interface BackButtonProps {
    onClick: () => void;
}

const BackButton: React.FC<BackButtonProps> = ({ onClick }) => {
    return (
        <div className="w-full max-w-5xl mx-auto mb-4">
            <button
                onClick={onClick}
                className="flex items-center gap-2 text-sm text-gray-400 hover:text-blue-400 transition-colors"
            >
                <ArrowLeftIcon className="w-5 h-5" />
                Back
            </button>
        </div>
    );
};

export default BackButton;
