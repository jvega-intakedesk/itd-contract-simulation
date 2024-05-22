// src/components/ProgressBar.js
import React from 'react';

const ProgressBar = ({ progress }) => {
    const containerStyles = {
        height: 20,
        width: '98%',
        backgroundColor: "#e0e0de",
        borderRadius: 50,
    };

    const fillerStyles = {
        height: '100%',
        width: `${progress}%`,
        backgroundColor: 'blue',
        borderRadius: 'inherit',
        textAlign: 'right',
        transition: 'width 1s ease-in-out',
    };

    return (
        <div style={containerStyles}>
            <div style={fillerStyles} />
        </div>
    );
};

export default ProgressBar;
