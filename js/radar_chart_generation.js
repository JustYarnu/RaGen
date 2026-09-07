const DEFAULT_DIMENSIONS = Array.from({ length: 6 }, () => ({ name: "Label", value: 5 }));
const PRESETS = {
    triangle: 3,
    square: 4,
    pentagon: 5,
    hexagon: 6,
    heptagon: 7,
    octagon: 8
};
const chartTitle = document.querySelector("#chart-title");
const previewTitle = document.querySelector("#preview-title");
const dimensionList = document.querySelector("#dimension-list");
const dimensionCount = document.querySelector("#dimension-count");
const scaleMaxInput = document.querySelector("#scale-max");
const accentPresetInput = document.querySelector("#accent-preset");
const accentColorInput = document.querySelector("#accent-color");
const lineStyleInput = document.querySelector("#line-style");
const fillOpacityInput = document.querySelector("#fill-opacity");
const fillOpacityValue = document.querySelector("#fill-opacity-value");
const exportBackgroundInput = document.querySelector("#export-background");
const exportBackgroundColorInput = document.querySelector("#export-bg-color");
const backgroundOpacityInput = document.querySelector("#background-opacity");
const backgroundOpacityValue = document.querySelector("#background-opacity-value");
const scaleNote = document.querySelector("#scale-note");
const exportGifButton = document.querySelector("#export-gif");
const MAX_AXES = 50;
const ACCENT_COLORS = { coral: "#f27e63", mint: "#2f7d6b", ocean: "#3276a8", plum: "#875b8f", gold: "#c28a27" };
const BACKGROUND_COLORS = { transparent: "#ffffff", white: "#ffffff", mint: "#e6f5ef", blush: "#fff0ec", charcoal: "#17231f" };
let dimensions = DEFAULT_DIMENSIONS.map((item) => ({ ...item }));
let customAccentColor = accentColorInput.value;
let customBackgroundColor = exportBackgroundColorInput.value;
let radarChart;

function renderInputs() {
    dimensionList.innerHTML = dimensions.map((dimension, index) => `
        <div class="dimension-row"><input class="dimension-name" data-index="${index}" type="text" value="${escapeHtml(dimension.name)}" placeholder="Label" maxlength="22" aria-label="Axis ${index + 1} Label"><input class="score-input" data-index="${index}" type="number" min="0" max="${getScaleMax()}" step="1" inputmode="numeric" pattern="[0-9]*" value="${dimension.value}" aria-label="Axis ${index + 1} score"><button class="remove-axis" data-index="${index}" type="button" aria-label="Remove axis ${index + 1}">&times;</button></div>`).join("");
    dimensionCount.textContent = `${dimensions.length} axes`;
}
function updateChart() {
    const title = chartTitle.value.trim() || "Untitled chart";
    previewTitle.textContent = title;
    radarChart.data.labels = dimensions.map((dimension) => dimension.name || "Label");
    radarChart.data.datasets[0].data = dimensions.map((dimension) => dimension.value);
    const color = accentColorInput.value;
    radarChart.data.datasets[0].borderColor = color;
    radarChart.data.datasets[0].backgroundColor = hexToRgba(color, Number(fillOpacityInput.value) / 100);
    radarChart.data.datasets[0].pointBackgroundColor = color;
    document.querySelector(".legend-dot").style.backgroundColor = color;
    radarChart.data.datasets[0].borderDash = lineStyleInput.value === "dashed" ? [8, 6] : [];
    radarChart.options.scales.r.max = getScaleMax();
    radarChart.options.scales.r.ticks.stepSize = getTickStep();
    scaleNote.textContent = `Scale: 0 to ${getScaleMax()}`;
    fillOpacityValue.textContent = `${fillOpacityInput.value}%`;
    fillOpacityInput.style.accentColor = color;
    backgroundOpacityValue.textContent = `${backgroundOpacityInput.value}%`;
    const backgroundColor = getBackgroundColor(exportBackgroundInput.value, exportBackgroundColorInput.value);
    backgroundOpacityInput.style.accentColor = backgroundColor || "#ffffff";
    document.querySelector(".chart-wrap").style.backgroundColor = backgroundColor ? hexToRgba(backgroundColor, Number(backgroundOpacityInput.value) / 100) : "transparent";
    radarChart.update();
}
function getScaleMax() {
    return Math.max(1, Math.min(1000, Number(scaleMaxInput.value) || 10));
}
function getTickStep() {
    return Math.max(1, Math.ceil(getScaleMax() / 5));
}
function normalizeNumberInput(input, maximum) {
    const digits = input.value.replace(/\D/g, "");
    if (!digits) return "";
    const value = Math.min(Number(digits), maximum);
    input.value = String(value);
    return value;
}
function restrictNumberInput(event) {
    if (!event.target.matches("#scale-max, .score-input")) return;
    if (event.inputType && event.inputType.startsWith("insert") && event.data && /\D/.test(event.data)) event.preventDefault();
}
function hexToRgba(hex, opacity) {
    const value = hex.replace("#", "");
    const red = parseInt(value.substring(0, 2), 16);
    const green = parseInt(value.substring(2, 4), 16);
    const blue = parseInt(value.substring(4, 6), 16);
    return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
}
function getBackgroundColor(background, customColor) {
    return background === "transparent" ? null : BACKGROUND_COLORS[background] || customColor;
}
function getExportBackground() {
    if (exportBackgroundInput.value === "transparent") return null;
    return hexToRgba(getBackgroundColor(exportBackgroundInput.value, exportBackgroundColorInput.value), Number(backgroundOpacityInput.value) / 100);
}
function getChartFileName(extension) {
    return `${chartTitle.value.trim().replace(/\s+/g, "-").toLowerCase() || "radar-chart"}.${extension}`;
}
function exportGif() {
    if (window.location.protocol === "file:") {
        window.alert("GIF export requires the page to be opened through a local web server. Run `python -m http.server` in the RaGen folder, then open http://localhost:8000/html/.");
        return;
    }
    if (typeof GIF === "undefined") {
        window.alert("GIF export is unavailable because the encoder could not be loaded.");
        return;
    }
    exportGifButton.disabled = true;
    exportGifButton.textContent = "Rendering GIF...";
    const frameRate = 60;
    const frameDelay = 1000 / frameRate;
    const animationFrames = Math.ceil(1200 / frameDelay);
    const holdFrames = Math.ceil(3000 / frameDelay);
    const finalData = radarChart.data.datasets[0].data.map((value) => Number(value) || 0);
    const frameCanvas = document.createElement("canvas");
    frameCanvas.width = radarChart.canvas.width;
    frameCanvas.height = radarChart.canvas.height;
    const frameContext = frameCanvas.getContext("2d");
    const background = getExportBackground();
    const gif = new GIF({ workers: 2, quality: 10, width: frameCanvas.width, height: frameCanvas.height, repeat: 0, workerScript: new URL("../js/gif.worker.js", document.baseURI).href });
    const addFrame = (progress) => {
        radarChart.data.datasets[0].data = finalData.map((value) => value * progress);
        radarChart.update("none");
        frameContext.clearRect(0, 0, frameCanvas.width, frameCanvas.height);
        if (background) { frameContext.fillStyle = background; frameContext.fillRect(0, 0, frameCanvas.width, frameCanvas.height); }
        frameContext.drawImage(radarChart.canvas, 0, 0);
        gif.addFrame(frameCanvas, { copy: true, delay: frameDelay });
    };
    for (let frame = 0; frame <= animationFrames; frame += 1) addFrame(frame / animationFrames);
    for (let frame = 0; frame < holdFrames; frame += 1) addFrame(1);
    gif.on("finished", (blob) => { const link = document.createElement("a"); link.download = getChartFileName("gif"); link.href = URL.createObjectURL(blob); link.click(); URL.revokeObjectURL(link.href); exportGifButton.disabled = false; exportGifButton.innerHTML = '<span aria-hidden="true">&#8595;</span> Export GIF'; });
    gif.render();
    radarChart.data.datasets[0].data = finalData;
    radarChart.update();
}
function escapeHtml(value) {
    return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character]));
}
document.addEventListener("DOMContentLoaded", () => {
    const context = document.querySelector("#radar-chart");
    radarChart = new Chart(context, {
        type: "radar",
        data: {
            labels: dimensions.map((dimension) => dimension.name),
            datasets: [{ data: dimensions.map((dimension) => dimension.value), borderColor: "#f27e63", backgroundColor: "rgba(242, 126, 99, .2)", pointBackgroundColor: "#f27e63", pointBorderColor: "#fff", pointBorderWidth: 2, pointRadius: 5, borderWidth: 2 }]
        },
        options: {
            maintainAspectRatio: false,
            scales: {
                r: {
                    min: 0, max: getScaleMax(), beginAtZero: true,
                    ticks: { stepSize: getTickStep(), color: "#9aa8a1", backdropColor: "transparent", font: { family: "DM Sans", size: 10 } },
                    grid: { color: "rgba(39, 124, 105, .16)" },
                    angleLines: { color: "rgba(39, 124, 105, .16)" },
                    pointLabels: { color: "#4b6259", font: { family: "DM Sans", size: 12, weight: "600" } }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: (chartContext) => ` ${chartContext.raw} / ${getScaleMax()}` } }
            }
        }
    });
    renderInputs();
    updateChart();
    dimensionList.addEventListener("beforeinput", restrictNumberInput);
    dimensionList.addEventListener("input", (event) => { const index = Number(event.target.dataset.index); if (event.target.classList.contains("dimension-name")) dimensions[index].name = event.target.value; if (event.target.classList.contains("score-input")) { const value = normalizeNumberInput(event.target, getScaleMax()); dimensions[index].value = value === "" ? 0 : value; } updateChart(); });
    dimensionList.addEventListener("click", (event) => { if (!event.target.classList.contains("remove-axis") || dimensions.length <= 3) return; dimensions.splice(Number(event.target.dataset.index), 1); renderInputs(); updateChart(); });
    chartTitle.addEventListener("input", updateChart);
    document.querySelector("#preset-select").addEventListener("change", (event) => { const sides = PRESETS[event.target.value]; if (!sides) return; const title = event.target.options[event.target.selectedIndex].text; chartTitle.value = title; dimensions = Array.from({ length: sides }, () => ({ name: "Label", value: 5 })); renderInputs(); updateChart(); });
    document.querySelector("#add-dimension").addEventListener("click", () => { if (dimensions.length >= MAX_AXES) return; dimensions.push({ name: "Label", value: Math.min(5, getScaleMax()) }); renderInputs(); updateChart(); });
    scaleMaxInput.addEventListener("beforeinput", restrictNumberInput);
    scaleMaxInput.addEventListener("input", () => { normalizeNumberInput(scaleMaxInput, 1000); dimensions.forEach((dimension) => { dimension.value = Math.min(dimension.value, getScaleMax()); }); renderInputs(); updateChart(); });
    [accentColorInput, lineStyleInput, fillOpacityInput, backgroundOpacityInput, exportBackgroundColorInput].forEach((input) => input.addEventListener("input", updateChart));
    accentPresetInput.addEventListener("change", () => { accentColorInput.value = accentPresetInput.value === "custom" ? customAccentColor : ACCENT_COLORS[accentPresetInput.value]; updateChart(); });
    accentColorInput.addEventListener("click", () => { accentPresetInput.value = "custom"; updateChart(); });
    accentColorInput.addEventListener("input", () => { customAccentColor = accentColorInput.value; accentPresetInput.value = "custom"; updateChart(); });
    exportBackgroundInput.addEventListener("change", () => { exportBackgroundColorInput.value = exportBackgroundInput.value === "custom" ? customBackgroundColor : BACKGROUND_COLORS[exportBackgroundInput.value]; updateChart(); });
    exportBackgroundColorInput.addEventListener("click", () => { exportBackgroundInput.value = "custom"; updateChart(); });
    exportBackgroundColorInput.addEventListener("input", () => { customBackgroundColor = exportBackgroundColorInput.value; exportBackgroundInput.value = "custom"; updateChart(); });
    document.querySelector("#reset-input").addEventListener("click", () => { chartTitle.value = "Hexagon"; dimensions = DEFAULT_DIMENSIONS.map((item) => ({ ...item })); document.querySelector("#preset-select").value = "hexagon"; renderInputs(); updateChart(); });
    document.querySelector("#reset-appearance").addEventListener("click", () => { scaleMaxInput.value = 10; accentPresetInput.value = "coral"; accentColorInput.value = "#f27e63"; customAccentColor = "#f27e63"; lineStyleInput.value = "solid"; fillOpacityInput.value = 20; exportBackgroundInput.value = "transparent"; exportBackgroundColorInput.value = "#ffffff"; customBackgroundColor = "#ffffff"; backgroundOpacityInput.value = 100; updateChart(); });
    document.querySelector("#export-chart").addEventListener("click", () => { const background = getExportBackground(); const context = radarChart.ctx; if (background) { context.save(); context.globalCompositeOperation = "destination-over"; context.fillStyle = background; context.fillRect(0, 0, radarChart.width, radarChart.height); context.restore(); } const link = document.createElement("a"); link.download = getChartFileName("png"); link.href = radarChart.toBase64Image(); link.click(); context.clearRect(0, 0, radarChart.width, radarChart.height); radarChart.draw(); });
    exportGifButton.addEventListener("click", exportGif);
});
