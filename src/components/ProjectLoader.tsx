import { useState, useEffect } from 'react';

// Project Loader Component
const ProjectLoader = ({ selectedProject }:any) => {
  const [progress, setProgress] = useState(0);
  const [loadingText, setLoadingText] = useState('Loading project...');

  const loadingMessages = [
    'Loading project...',
    'Loading tasks...',
    'Preparing interface...',
    'Loading data...',
    'Almost ready...',
    'Complete!'
  ];

  useEffect(() => {
    // Complete loading in exactly 4 seconds
    const totalDuration = 4000; // 4 seconds
    const intervalTime = 100; // Update every 100ms
    const increment = 100 / (totalDuration / intervalTime);
    
    const interval = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + increment;
        
        if (newProgress >= 100) {
          clearInterval(interval);
          setLoadingText(loadingMessages[loadingMessages.length - 1]);
          
          // Navigate to project after completion
          setTimeout(() => {
            window.location.href = '/project';
          }, 500);
          
          return 100;
        }
        
        // Update loading message based on progress
        const messageIndex = Math.floor((newProgress / 100) * (loadingMessages.length - 1));
        setLoadingText(loadingMessages[messageIndex]);
        
        return newProgress;
      });
    }, intervalTime);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center z-50">
      <div className="text-center">
        {/* Logo */}
        <div className="mb-6 relative">
          <div className="w-20 h-20 mx-auto bg-white rounded-xl shadow-lg flex items-center justify-center">
            <img 
              src="/AVAMENT_big.png" 
              alt="AVAMENT" 
              className="w-16 h-16 object-contain"
            />
          </div>
          
          {/* Pulse effect */}
          <div className="absolute inset-0 w-20 h-20 mx-auto bg-blue-400 rounded-xl animate-ping opacity-20"></div>
        </div>

        {/* App title */}
        <h1 className="text-xl font-semibold text-gray-800 mb-6">
          AVAMENT - LAEN
        </h1>

        {/* Loading bar */}
        <div className="w-64 max-w-sm mx-auto">
          <div className="bg-white/70 backdrop-blur-sm rounded-full p-1 shadow-lg mb-3">
            <div 
              className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all duration-500 ease-out relative overflow-hidden"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse"></div>
            </div>
          </div>
          
          {/* Progress percentage */}
          <div className="text-lg font-semibold text-blue-600 mb-2">
            {Math.round(progress)}%
          </div>
          
          {/* Loading text */}
          <p className="text-gray-600 text-sm transition-all duration-300">
            {loadingText}
          </p>
        </div>

        {/* Project name */}
        {/* {selectedProject && (
          <div className="text-gray-500 text-xs mt-4">
            Loading <span className="text-blue-600 font-medium">{selectedProject.name}</span>
          </div>
        )} */}

        {/* Loading dots */}
        <div className="flex justify-center space-x-2 mt-6">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        </div>
      </div>
    </div>
  );
};

 
export default ProjectLoader;