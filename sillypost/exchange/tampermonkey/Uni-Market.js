// ==UserScript==
// @name         Sillypost Market Widget - Universal
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Shows Sillypost market status on any website
// @author       CellIJel
// @match        *://*/*
// @connect      sillypost.net
// @grant        GM_xmlhttpRequest
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    // Create and inject CSS for the widget and flash overlay
    const styleSheet = document.createElement('style');
    styleSheet.textContent = `
        #sillypost-market-widget {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: rgba(40, 40, 40, 0.95);
            border: 2px solid #444;
            border-radius: 8px;
            padding: 10px;
            z-index: 999999;
            color: white;
            font-family: sans-serif;
            min-width: 200px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
            cursor: move;
            user-select: none;
        }

        a:hover {
            text-shadow: 0 0 3px #ffffff80;
            color: #fff !important;
            font-weight: bold;
            font-family: arial;
        }

        a {
        transition: all .2s;
        color: #fff !important;
        font-weight: bold;
        font-family: arial;
        }

        #sillypost-price-flash-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 999998;
            opacity: 0;
            transition: opacity 0.5s ease-out;
        }

        #sillypost-price-flash-overlay.flash {
            opacity: 0.2;
            transition: none;
        }

        #sillypost-market-widget.minimized {
            min-width: auto;
            padding: 5px;
        }

        #sillypost-market-widget h3 {
            margin: 0 0 10px 0;
            font-size: 14px;
            color: #fff;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        #sillypost-market-widget.minimized h3 {
            margin: 0;
        }

        button:hover {
        transform: translateY(-1px);
        box-shadow: 0 3px 6px #00000040;
        background: none;
        }

        .sillypost-market-title {
            cursor: pointer;
            color: #fff;
            text-decoration: none;
            font-weight: bold;
            font-family: arial;
        }

        .sillypost-market-title:hover {
            color: #aaa;
            text-decoration: underline;
        }

        #sillypost-market-status {
            font-size: 16px;
            font-weight: bold;
            margin: 5px 0;
            text-align: center;
        }

        #sillypost-market-price, #sillypost-market-owned {
            font-size: 14px;
            text-align: center;
            margin: 5px 0;
        }

        .sillypost-widget-controls {
            display: flex;
            gap: 5px;
        }

        button {
        font-weight: bold;
        color:#fff; !important
        }

        .sillypost-widget-button {
            background: none;
            border: none;
            color: #fff;
            cursor: pointer;
            font-size: 12px;
            padding: 2px;
        }

        .sillypost-widget-button:hover {
            color: #fff;
        }

        #sillypost-market-widget.minimized .sillypost-widget-content {
            display: none;
        }

        .status-color-swag { color: #ff4444; }
        .status-color-soback { color: #ffaa00; }
        .status-color-mid { color: #888888; }
        .status-color-inshambles { color: #44bb44; }
        .status-color-soover { color: #00ff00; }

        .sillypost-market-stats {
            display: flex;
            flex-direction: column;
            gap: 5px;
        }

        .price-up {
            color: #00ff00;
        }

        .price-down {
            color: #ff4444;
        }
    `;
    document.head.appendChild(styleSheet);

    // Create flash overlay
    const overlay = document.createElement('div');
    overlay.id = 'sillypost-price-flash-overlay';
    document.body.appendChild(overlay);

    // Create widget HTML
    const widget = document.createElement('div');
    widget.id = 'sillypost-market-widget';
    widget.innerHTML = `
        <h3>
            <a href="https://sillypost.net/games/sillyexchange" class="sillypost-market-title" target="_blank">Sillypost Market</a>
            <div class="sillypost-widget-controls">
                <button class="sillypost-widget-button minimize-btn">_</button>
                <button class="sillypost-widget-button close-btn">×</button>
            </div>
        </h3>
        <div class="sillypost-widget-content">
            <div class="sillypost-market-stats">
                <div id="sillypost-market-status">Loading...</div>
                <div id="sillypost-market-price">Price: ... beans</div>
                <div id="sillypost-market-owned">Owned: ... sillies</div>
            </div>
        </div>
    `;
    document.body.appendChild(widget);

    // Keep track of previous price
    let previousPrice = null;

    // Flash screen function
    function flashScreen(priceUp) {
        const overlay = document.getElementById('sillypost-price-flash-overlay');
        overlay.style.backgroundColor = priceUp ? '#00ff00' : '#ff0000';
        overlay.classList.add('flash');

        setTimeout(() => {
            overlay.classList.remove('flash');
        }, 200);
    }

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
        if (e.target.classList.contains('sillypost-widget-button') || e.target.classList.contains('sillypost-market-title')) return;

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
        overlay.remove();
    });

    // Make cross-origin request to Sillypost
    function makeRequest(url, method) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: method,
                url: `https://sillypost.net${url}`,
                withCredentials: true,
                headers: {
                    'Accept': 'application/json'
                },
                onload: function(response) {
                    if (response.status === 200) {
                        resolve(response.responseText);
                    } else {
                        reject(new Error(`Request failed with status ${response.status}`));
                    }
                },
                onerror: function(error) {
                    reject(error);
                }
            });
        });
    }

    // Get owned sillies
    async function getSilliesOwned() {
        try {
            const response = await makeRequest('/games/sillyexchange/owned', 'POST');
            return response;
        } catch (error) {
            console.error('Error getting owned sillies:', error);
            return null;
        }
    }

    // Market status update function
    async function updateMarketStatus() {
        try {
            const [marketResponse, ownedSillies] = await Promise.all([
                makeRequest('/games/sillyexchange', 'POST'),
                getSilliesOwned()
            ]);

            const state = JSON.parse(marketResponse);
            const statusElm = document.getElementById('sillypost-market-status');
            const priceElm = document.getElementById('sillypost-market-price');
            const ownedElm = document.getElementById('sillypost-market-owned');

            // Check if price changed and flash screen
            if (previousPrice !== null && state.price !== previousPrice) {
                const priceUp = state.price > previousPrice;
                flashScreen(priceUp);

                // Add temporary color to price
                priceElm.classList.add(priceUp ? 'price-up' : 'price-down');
                setTimeout(() => {
                    priceElm.classList.remove('price-up', 'price-down');
                }, 1000);
            }
            previousPrice = state.price;

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
            priceElm.textContent = `Price: ${state.price} beans`;

            if (ownedSillies !== null) {
                ownedElm.textContent = `Owned: ${ownedSillies} sillies`;
            } else {
                ownedElm.textContent = 'Owned: ... sillies';
            }

        } catch (error) {
            console.error('Error updating market status:', error);
            document.getElementById('sillypost-market-status').textContent = 'Error loading status';
        }
    }

    // Initial update and set interval
    updateMarketStatus();
    setInterval(updateMarketStatus, 20000); // Update every 20 seconds
})();