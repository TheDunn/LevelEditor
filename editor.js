let currentLayer = 0;
let maxLayers = 5;
let selectedTile = null;
let isMouseDown = false;
let deleteMode = false;
let mapTiles = [];
let historyStack = [];
let tilesData = [];

function initializeMap(cols, rows) {
    mapTiles = Array.from({ length: maxLayers + 1 }, () => 
        Array.from({ length: rows }, () => Array(cols).fill(null))
    );
}

document.getElementById('configureMap').addEventListener('click', function() {
    const map = document.getElementById('map');
    const tileSize = parseInt(document.getElementById('tileSize').value) || 0;
    const cols = parseInt(document.getElementById('mapWidth').value) || 0;
    const rows = parseInt(document.getElementById('mapHeight').value) || 0;
    const file = document.getElementById('tilemapInput').files[0] || null;

    if (!file) {
        alert('Please select a file');
        return;
    }

    tilesData = [];
    currentLayer = 0;

    configureTiles(file);
    initializeMap(cols, rows);

    map.innerHTML = '';
    map.style.gridTemplateColumns = `repeat(${cols}, ${tileSize}px)`;
    map.style.gridTemplateRows = `repeat(${rows}, ${tileSize}px)`;
    map.style.setProperty('--gap-size', `1px`);

    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {     
            const tile = document.createElement('div');
            tile.className = 'tile';
            tile.dataset.x = x;
            tile.dataset.y = y;
            tile.style.width = `${tileSize}px`;
            tile.style.height = `${tileSize}px`;

            tile.addEventListener('click', function() {
                if (selectedTile) {
                    mapTiles[currentLayer][y][x] = deleteMode ? null : selectedTile;
                    renderLayerTiles();
                }
            });
            map.appendChild(tile);
        }
    }

    //Handle mouse drag to place selected tile
    map.addEventListener('mousedown', function (e) {
        const tile = e.target;
        if (tile.classList.contains('tile')) {
            isMouseDown = true;
            placeTile(e);
        }
    });

    map.addEventListener('mousemove', function (e) {
        const tile = e.target;
        if (isMouseDown && selectedTile && tile.classList.contains('tile')) {
            placeTile(e);
        }
    });

    map.addEventListener('mouseup', function () {
        if (isMouseDown) {
            isMouseDown = false;
            saveMapState();
        }
    });

    map.addEventListener('mouseleave', function () {
        // Reset the state if the mouse leaves the map area while dragging
        if (isMouseDown) {
            isMouseDown = false;
            saveMapState();
        }
    });

    function placeTile(e) {
        const tile = e.target;
        if (tile.classList.contains('tile')) {
            mapTiles[currentLayer][tile.dataset.y][tile.dataset.x] = deleteMode ? null : selectedTile;
            renderLayerTiles();
        }
    }

    saveMapState();
    updateLayer();
    Array.from(document.querySelectorAll('.hidden')).forEach(el => el.style.display = 'block');
});

function configureTiles(file) {
    if (!file) return;

    const tileSize = parseInt(document.getElementById('tileSize').value) || 16;
    const gapSize = parseInt(document.getElementById('gapSize').value) || 0;   
    const tilesContainer = document.getElementById('tiles');

    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.src = e.target.result;

        img.onload = function() {
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            const tiles = [];

            canvas.width = img.width;
            canvas.height = img.height;
            context.drawImage(img, 0, 0);

            const rows = Math.ceil(img.height / (tileSize + gapSize));
            const cols = Math.ceil(img.width / (tileSize + gapSize));

            tilesContainer.innerHTML = '';
            tilesContainer.style.display = 'grid';
            tilesContainer.style.gridTemplateColumns = `repeat(auto-fill, ${tileSize}px)`;
            tilesContainer.style.gridGap = `1px`;

            for (let y = 0; y < rows; y++) {
                for (let x = 0; x < cols; x++) {
                    const tileCanvas = document.createElement('canvas');
                    const tileContext = tileCanvas.getContext('2d');

                    tileCanvas.width = tileSize;
                    tileCanvas.height = tileSize;

                    tileContext.drawImage(
                        canvas,
                        x * (tileSize + gapSize),
                        y * (tileSize + gapSize),
                        tileSize,
                        tileSize,
                        0,
                        0,
                        tileSize,
                        tileSize
                    );

                    const tileDataURL = tileCanvas.toDataURL();
                    tiles.push(tileDataURL);

                    const tileImg = document.createElement('img');
                    const tileName = `tile_${x}_${y}`;
                    tileImg.className = 'draggable-tile';
                    tileImg.src = tileDataURL;
                    tileImg.dataset.name = tileName;
                    tileImg.style.width = `${tileSize}px`;
                    tileImg.style.height = `${tileSize}px`;

                    const tileData = {
                        url: tileDataURL,
                        name: tileName,
                        x: x,
                        y: y
                    };

                    tilesData.push(tileData);

                    tileImg.addEventListener('click', function() {
                        selectedTile = tileData;
                        const allTiles = document.querySelectorAll('.draggable-tile');
                        allTiles.forEach(img => img.classList.remove('selected'));
                        tileImg.classList.add('selected');
                    });

                    tilesContainer.appendChild(tileImg);
                }
            }
        };
    };
    reader.readAsDataURL(file);
}

document.getElementById('upLayer').addEventListener('click', function() {
    if (currentLayer == maxLayers) return;
    currentLayer += 1;
    updateLayer();
});

document.getElementById('downLayer').addEventListener('click', function() {
    if (currentLayer == 0) return;
    currentLayer -= 1;
    updateLayer();
});

function updateLayer() {
    const display = document.getElementById('layerDisplay');
    display.innerHTML = currentLayer;
    renderLayerTiles();
}

function renderLayerTiles() {
    const tiles = document.getElementsByClassName('tile');
    const tileSize = parseInt(document.getElementById('tileSize').value) || 0;
    const cols = parseInt(document.getElementById('mapWidth').value) || 0;

    mapTiles[0].forEach((row, rowIndex) => {
        row.forEach((_, colIndex) => {
            const tileIndex = rowIndex * cols + colIndex;
            const tileCell = tiles[tileIndex];

            if (tileCell) {
                let backgrounds = [];
                let backgroundSizes = [];
                let blendModes = [];

                const startLayer = Math.max(0, currentLayer - 1);
                for (let layer = currentLayer; layer >= startLayer; layer--) {
                    const tile = mapTiles[layer]?.[rowIndex]?.[colIndex];
                    if (tile && tile.url) {
                        if (layer < currentLayer) {
                            backgrounds.push(`linear-gradient(rgba(255, 255, 255, 0.5), rgba(255, 255, 255, 0.5)), url(${tile.url})`);
                        } else {
                            backgrounds.push(`url(${tile.url})`);
                        }
                        backgroundSizes.push(`${tileSize}px ${tileSize}px`);
                        blendModes.push('normal');
                    }
                }

                tileCell.style.backgroundImage = backgrounds.join(', ');
                tileCell.style.backgroundSize = backgroundSizes.join(', ');
                tileCell.style.backgroundBlendMode = blendModes.join(', ');
            }
        });
    });
}

document.getElementById('fillMap').addEventListener('click', function() {
    const cols = parseInt(document.getElementById('mapWidth').value) || 0;
    const rows = parseInt(document.getElementById('mapHeight').value) || 0;

    if (selectedTile) {
        let makeUpdate = false;
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) { 
                if (mapTiles[currentLayer][y][x]?.name == selectedTile?.name) continue;
                mapTiles[currentLayer][y][x] = selectedTile;
                makeUpdate = true;
            }
        }
        renderLayerTiles();
        if (makeUpdate) saveMapState();
    }
});

document.getElementById('undoButton').addEventListener('click', function() {
    if (historyStack.length > 0) {
        historyStack.pop();
        const previousState = historyStack[historyStack.length - 1];
        if (previousState) {
            restoreMapState(previousState);
        }
        if (historyStack.length === 0) {
            saveMapState();
        }
    }
});

function saveMapState() {
    const currentState = mapTiles.map(layer => 
        layer.map(row => row.slice()) 
    );
    historyStack.push(currentState);
}

function restoreMapState(state) {
    mapTiles = state.map(layer => 
        layer.map(row => row.slice()) 
    );
    renderLayerTiles();
}

// Delete mode
document.getElementById('removeTile').addEventListener('click', function() {
    deleteMode = !deleteMode;

    const button = this;
    button.textContent = deleteMode ? 'Delete mode (on)' : 'Delete mode (off)';
    button.className = deleteMode ? 'btn btn-sm btn-danger' : 'btn btn-sm btn-secondary';
});

// Export
document.getElementById('exportMap').addEventListener('click', exportTilemap);

function exportTilemap() {
    const mapWidth = parseInt(document.getElementById('mapWidth').value) || 10;
    const mapHeight = parseInt(document.getElementById('mapHeight').value) || 10;

    let tilemap = [];
    for (let layerIndex = 0; layerIndex <= maxLayers; layerIndex++) {
        let layer = [];
        for (let y = 0; y < mapHeight; y++) {
            for (let x = 0; x < mapWidth; x++) {
                const tile = mapTiles[layerIndex][y][x];
                if (tile) layer.push({ name: tile.name, x, y });
            }
        }
        if (layer.length > 0) tilemap.push(layer);
    }

    if (tilemap.length === 0) {
        alert('Nothing to export.');
        return;
    }

    toJson('level', tilemap);
}

document.getElementById('exportTileData').addEventListener('click', exportTiles);

function exportTiles() {
    if (tilesData.length === 0) {
        return;
    }    

    const filteredData = tilesData.map(tile => ({
        name: tile.name,
        x: tile.x,
        y: tile.y
    }));

    toJson('tile_data', filteredData);
}

function toJson(fileName, data) {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}.json`;
    a.click();

    URL.revokeObjectURL(url);
}

//Import
document.getElementById('tilemapImport').addEventListener('change', importTilemap);

function importTilemap(event) {
    const file = event.target.files[0]; 
    if (!file) {
        alert('Please select a valid JSON file.');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const json = e.target.result;
            const tilemap = JSON.parse(json);

            if (!Array.isArray(tilemap)) {
                alert('Invalid tilemap format.');
                return;
            }

            loadTilemap(tilemap);
        } catch (error) {
            alert('Error parsing JSON file: ' + error.message);
        }
    };

    reader.readAsText(file);
}

function loadTilemap(tilemap) {
    const mapWidth = parseInt(document.getElementById('mapWidth').value) || 0;
    const mapHeight = parseInt(document.getElementById('mapHeight').value) || 0;

    mapTiles = [];
    initializeMap(mapWidth, mapHeight);

    for (let layerIndex = 0; layerIndex < tilemap.length; layerIndex++) {
        const layer = tilemap[layerIndex];
        for (let tileIndex = 0; tileIndex < layer.length; tileIndex++) {
            const tile = layer[tileIndex];
            if (!tile) continue;

            if (
                mapTiles[layerIndex] &&
                mapTiles[layerIndex][tile.y] &&
                mapTiles[layerIndex][tile.y][tile.x] !== undefined
            ) {
                const selectedTile = tilesData.find(candidateTile => candidateTile.name === tile.name);
                console.log(selectedTile);
                if (selectedTile) {
                    mapTiles[layerIndex][tile.y][tile.x] = selectedTile;
                } else {
                    console.warn(`Tile '${tile.name}' not found in tilesData.`);
                }
            } else {
                console.warn(
                    `Position [${tile.x}, ${tile.y}] in layer ${layerIndex} is not initialized in mapTiles.`
                );
            }
        }
    }

    currentLayer = 0;
    saveMapState();
    updateLayer();

    document.getElementById('tilemapImport').value = '';
}

// Zoom
let zoomLevel = 1;
const zoomStep = 0.1;
const zoomMin = 0.1;
const zoomMax = 3;
const map = document.getElementById('map');

document.querySelector('.mapRender').addEventListener('wheel', (e) => {
    e.preventDefault();

    const deltaZoom = e.deltaY < 0 ? zoomStep : -zoomStep;
    zoomLevel = Math.min(Math.max(zoomLevel + deltaZoom, zoomMin), zoomMax);

    map.style.transform = `scale(${zoomLevel})`;
});

document.getElementById('resetZoom').addEventListener('click', () => {
    zoomLevel = 1;
    map.style.transform = `scale(1)`;
});

const mapWrapper = document.getElementById('mapWrapper');
const mapRender = document.querySelector('.mapRender');

function adjustMapPadding() {
    const mapWidth = map.offsetWidth;
    const mapHeight = map.offsetHeight;
    const renderWidth = mapRender.clientWidth;
    const renderHeight = mapRender.clientHeight;

    const horizontalPadding = Math.max((renderWidth - mapWidth) / 2, 0);
    const verticalPadding = Math.max((renderHeight - mapHeight) / 2, 0);

    mapRender.style.padding = `${verticalPadding}px ${horizontalPadding}px`;
}

window.addEventListener('resize', adjustMapPadding);
adjustMapPadding();