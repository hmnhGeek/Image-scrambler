import React, { useRef, useState } from "react";
import "./ImageScrambler.css";

function ImageScrambler() {
  const canvasRef = useRef();
  const fileInputRef = useRef();
  const [originalImage, setOriginalImage] = useState(null);
  const [mode, setMode] = useState("encrypt");
  const [key, setKey] = useState("");

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        setOriginalImage(reader.result);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  };

  const sha256 = async (str) => {
    const buffer = new TextEncoder().encode(str);
    const hash = await crypto.subtle.digest("SHA-256", buffer);
    return new Uint8Array(hash);
  };

  const seedRandom = async (key) => {
    const hash = await sha256(key);
    let i = 0;
    return () => {
      if (i >= hash.length - 4) i = 0;
      const val =
        (hash[i] << 24) |
        (hash[i + 1] << 16) |
        (hash[i + 2] << 8) |
        hash[i + 3];
      i += 4;
      return (val >>> 0) / 0xffffffff;
    };
  };

  const processImage = async () => {
    if (!key) return alert("Please enter a secret key");

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const { width, height } = canvas;
    const imageData = ctx.getImageData(0, 0, width, height);
    const pixels = imageData.data;
    const totalPixels = width * height;

    const rand = await seedRandom(key);
    const indices = Array.from({ length: totalPixels }, (_, i) => i);

    for (let i = totalPixels - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }

    const result = new Uint8ClampedArray(pixels.length);

    if (mode === "encrypt") {
      for (let i = 0; i < totalPixels; i++) {
        const srcIdx = i * 4;
        const destIdx = indices[i] * 4;
        result[destIdx] = pixels[srcIdx];
        result[destIdx + 1] = pixels[srcIdx + 1];
        result[destIdx + 2] = pixels[srcIdx + 2];
        result[destIdx + 3] = pixels[srcIdx + 3];
      }
    } else {
      for (let i = 0; i < totalPixels; i++) {
        const srcIdx = indices[i] * 4;
        const destIdx = i * 4;
        result[destIdx] = pixels[srcIdx];
        result[destIdx + 1] = pixels[srcIdx + 1];
        result[destIdx + 2] = pixels[srcIdx + 2];
        result[destIdx + 3] = pixels[srcIdx + 3];
      }
    }

    const newImageData = new ImageData(result, width, height);
    ctx.putImageData(newImageData, 0, 0);
  };

  const downloadImage = () => {
    const canvas = canvasRef.current;
    const link = document.createElement("a");
    link.download = "processed.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const handleReset = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      canvas.width = canvas.height = 0;
    }

    setOriginalImage(null);
    setKey("");
    setMode("encrypt");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleViewInNewTab = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataURL = canvas.toDataURL("image/png");
    const win = window.open();
    if (win) {
      win.document.write(
        `<title>Processed Image</title><img src="${dataURL}" style="max-width:100%; display:block; margin:auto;"/>`
      );
    } else {
      alert("Popup blocked! Please allow popups for this site.");
    }
  };

  return (
    <div className="scrambler-container">
      <h2>🔐 Image Scrambler</h2>

      <input
        type="file"
        accept="image/png"
        onChange={handleImageUpload}
        ref={fileInputRef}
        className="file-input"
      />

      <input
        type="text"
        placeholder="Enter secret key"
        value={key}
        onChange={(e) => setKey(e.target.value)}
        className="text-input"
      />

      <div className="mode-toggle">
        <button
          className={`mode-button ${mode === "encrypt" ? "active" : ""}`}
          onClick={() => setMode("encrypt")}
        >
          Encrypt
        </button>
        <button
          className={`mode-button ${mode === "decrypt" ? "active" : ""}`}
          onClick={() => setMode("decrypt")}
        >
          Decrypt
        </button>
      </div>

      <div className="action-buttons">
        <button className="primary-button" onClick={processImage}>
          Process
        </button>
        <button
          className="secondary-button"
          onClick={downloadImage}
          disabled={!originalImage}
        >
          Download
        </button>
        <button
          className="secondary-button"
          onClick={handleViewInNewTab}
          disabled={!originalImage}
        >
          View in New Tab
        </button>
        <button
          className="secondary-button"
          onClick={handleReset}
          disabled={!originalImage}
        >
          Reset
        </button>
      </div>

      <canvas ref={canvasRef} className="image-canvas" />

      {originalImage && <p className="note">🔁 Refresh to reset image</p>}
    </div>
  );
}

export default ImageScrambler;
