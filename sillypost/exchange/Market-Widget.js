// ==UserScript==
// @name         Sillypost Market Widget
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Adds a floating market status widget to Sillypost pages
// @author       CellIJel
// @match        https://sillypost.net/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    // Create and inject CSS for the widget
    const styleSheet = document.createElement('style');
    styleSheet.textContent = `
        #market-widget {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: rgba(40, 40, 40, 0.95);
            border: 2px solid #444;
            border-radius: 8px;
            padding: 10px;
            z-index: 9999;
            color: white;
            font-family: sans-serif;
            min-width: 200px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
            cursor: move;
            user-select: none;
        }

        #market-widget.minimized {
            min-width: auto;
            padding: 5px;
        }

        #market-widget h3 {
            margin: 0 0 10px 0;
            font-size: 14px;
            color: #fff;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        #market-widget.minimized h3 {
            margin: 0;
        }

        .market-title {
            cursor: pointer;
            color: #fff;
            text-decoration: none;
        }

        .market-title:hover {
            color: #aaa;
            text-decoration: underline;
        }

        #market-status {
            font-size: 16px;
            font-weight: bold;
            margin: 5px 0;
            text-align: center;
        }

        #market-price, #market-owned {
            font-size: 14px;
            text-align: center;
            margin: 5px 0;
        }

        .widget-controls {
            display: flex;
            gap: 5px;
        }

        .widget-button {
            background: none;
            border: none;
            color: #888;
            cursor: pointer;
            font-size: 12px;
            padding: 2px;
        }

        .widget-button:hover {
            color: #fff;
        }

        #market-widget.minimized .widget-content {
            display: none;
        }

        .status-color-swag { color: #ff4444; }
        .status-color-soback { color: #ffaa00; }
        .status-color-mid { color: #888888; }
        .status-color-inshambles { color: #44bb44; }
        .status-color-soover { color: #00ff00; }

        .market-stats {
            display: flex;
            flex-direction: column;
            gap: 5px;
        }
    `;
    document.head.appendChild(styleSheet);

    // Create widget HTML
    const widget = document.createElement('div');
    widget.id = 'market-widget';
    widget.innerHTML = `
        <h3>
            <a href="https://sillypost.net/games/sillyexchange" class="market-title">Market Status</a>
            <div class="widget-controls">
                <button class="widget-button minimize-btn">_</button>
                <button class="widget-button close-btn">×</button>
            </div>
        </h3>
        <div class="widget-content">
            <div class="market-stats">
                <div id="market-status">Loading...</div>
                <div id="market-price">Price: ... beans</div>
                <div id="market-owned">Owned: ... sillies</div>
            </div>
        </div>
    `;
    document.body.appendChild(widget);

    // Make widget draggable
    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;
    let xOffset = 0;
    let yOffset = 0;

    widget.addEventListener('mousedown', dragStart);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', dragEnd);

    function dragStart(e) {
        // Don't initiate drag if clicking on a button or the title link
        if (e.target.classList.contains('widget-button') || e.target.classList.contains('market-title')) return;

        initialX = e.clientX - xOffset;
        initialY = e.clientY - yOffset;

        if (e.target === widget || e.target.parentNode === widget) {
            isDragging = true;
        }
    }

    function drag(e) {
        if (isDragging) {
            e.preventDefault();
            currentX = e.clientX - initialX;
            currentY = e.clientY - initialY;

            xOffset = currentX;
            yOffset = currentY;

            setTranslate(currentX, currentY, widget);
        }
    }

    function dragEnd() {
        initialX = currentX;
        initialY = currentY;
        isDragging = false;
    }

    function setTranslate(xPos, yPos, el) {
        el.style.transform = `translate(${xPos}px, ${yPos}px)`;
    }

    // Widget controls
    const minimizeBtn = widget.querySelector('.minimize-btn');
    const closeBtn = widget.querySelector('.close-btn');

    minimizeBtn.addEventListener('click', () => {
        widget.classList.toggle('minimized');
        minimizeBtn.textContent = widget.classList.contains('minimized') ? '□' : '_';
    });

    closeBtn.addEventListener('click', () => {
        widget.remove();
    });

    // Get owned sillies
    async function getSilliesOwned() {
        try {
            const response = await fetch('/games/sillyexchange/owned', {method: 'POST'});
            if (!response.ok) return null;
            return await response.text();
        } catch (error) {
            console.error('Error getting owned sillies:', error);
            return null;
        }
    }

    // Market status update function
    async function updateMarketStatus() {
        try {
            const [marketResponse, ownedSillies] = await Promise.all([
                fetch('/games/sillyexchange', {method: 'POST'}),
                getSilliesOwned()
            ]);

            if (!marketResponse.ok) return;

            const state = await marketResponse.json();
            const statusElm = document.getElementById('market-status');
            const priceElm = document.getElementById('market-price');
            const ownedElm = document.getElementById('market-owned');

            let statusText = '';
            let statusClass = '';

            switch (state.status.toLowerCase()) {
                case 'soover':
                    statusText = 'BUY';
                    statusClass = 'soover';
                    break;
                case 'inshambles':
                    statusText = 'Consider Buying';
                    statusClass = 'inshambles';
                    break;
                case 'mid':
                    statusText = 'Consider Holding';
                    statusClass = 'mid';
                    break;
                case 'soback':
                    statusText = 'Consider Selling';
                    statusClass = 'soback';
                    break;
                case 'swag':
                    statusText = 'SELL';
                    statusClass = 'swag';
                    break;
            }

            statusElm.textContent = statusText;
            statusElm.className = `status-color-${statusClass}`;
            priceElm.textContent = `Price: ${state.price} dollars`;

            if (ownedSillies !== null) {
                ownedElm.textContent = `Owned: ${ownedSillies} sillies`;
            } else {
                ownedElm.textContent = 'Owned: ... sillies';
            }

        } catch (error) {
            console.error('Error updating market status:', error);
        }
    }

    // Initial update and set interval
    updateMarketStatus();
    setInterval(updateMarketStatus, 20000); // Update every 20 seconds
})();
