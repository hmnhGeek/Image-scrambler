import React, { useRef, useState } from "react";
import "./ImageScrambler.css";
import { Box, IconButton, ImageList, ImageListItem } from "@mui/material";

function ImageScrambler() {
  const canvasRef = useRef();
  const [mode, setMode] = useState("encrypt");
  const [key, setKey] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageList, setImageList] = useState([]);
  const [processedImages, setProcessedImages] = useState([]);
  const [expandedIndex, setExpandedIndex] = useState(null);
  const [animateIn, setAnimateIn] = useState(false);

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

  const processImageFile = async (file) => {
    const img = new Image();
    img.src = URL.createObjectURL(file);

    return new Promise((resolve) => {
      img.onload = async () => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

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
        const dataUrl = canvas.toDataURL("image/png");

        resolve({ url: dataUrl, name: file.name });
      };
    });
  };

  const handleEncryptImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith("image/")) return;
    setSelectedImage(file);
  };

  const handleDecryptFolder = (e) => {
    const files = Array.from(e.target.files).filter((f) =>
      f.type.startsWith("image/")
    );
    setImageList(files);
  };

  const processSelected = async () => {
    if (!key) return alert("Please enter a secret key");
    setProcessedImages([]);

    if (mode === "encrypt" && selectedImage) {
      const processed = await processImageFile(selectedImage);
      setProcessedImages([processed]);
    } else if (mode === "decrypt" && imageList.length > 0) {
      const results = [];
      for (const file of imageList) {
        const processed = await processImageFile(file);
        results.push(processed);
      }
      setProcessedImages(results);
    } else {
      alert("Please select input and mode correctly.");
    }
  };

  const openOverlay = (index) => {
    setExpandedIndex(index);
    setTimeout(() => setAnimateIn(true), 10);
  };

  const closeOverlay = () => {
    setAnimateIn(false);
    setTimeout(() => {
      setExpandedIndex(null);
    }, 300);
  };

  const currentImage = processedImages[expandedIndex]?.url;

  return (
    <>
      <div className="scrambler-container">
        <h2>🔐 Image Scrambler</h2>

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

        {mode === "encrypt" && (
          <input
            type="file"
            accept="image/*"
            onChange={handleEncryptImageSelect}
          />
        )}

        {mode === "decrypt" && (
          <input
            type="file"
            webkitdirectory="true"
            directory="true"
            multiple
            onChange={handleDecryptFolder}
          />
        )}

        <button className="primary-button" onClick={processSelected}>
          Process
        </button>

        <canvas ref={canvasRef} style={{ display: "none" }} />
      </div>

      <Box sx={{ maxWidth: 1200, margin: "auto", mt: 5 }}>
        <ImageList cols={3} gap={8}>
          {processedImages.map((img, i) => (
            <ImageListItem
              key={img.id}
              sx={{
                position: "relative",
                "&:hover .remove-icon": {
                  opacity: 1,
                },
              }}
            >
              <img
                src={img.url}
                alt={`img-${i}`}
                loading="lazy"
                style={{ cursor: "pointer" }}
                onClick={() => openOverlay(i)}
                // onError={() => handleImageError(img.id)}
              />
              {/* <IconButton
                className="remove-icon"
                size="small"
                onClick={() => removeSlide(img.id)}
                sx={{
                  position: "absolute",
                  top: 4,
                  right: 4,
                  backgroundColor: "rgba(0,0,0,0.6)",
                  color: "white",
                  opacity: 0,
                  transition: "opacity 0.3s ease",
                  "&:hover": {
                    backgroundColor: "rgba(255,0,0,0.7)",
                  },
                }}
              >
                <Remove fontSize="small" />
              </IconButton> */}
            </ImageListItem>
          ))}
        </ImageList>
      </Box>
      {expandedIndex !== null && currentImage && (
        <div
          onClick={closeOverlay}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: animateIn ? "rgba(0,0,0,0.85)" : "rgba(0,0,0,0)",
            opacity: animateIn ? 1 : 0,
            transition: "background-color 300ms ease, opacity 300ms ease",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1300,
            cursor: "zoom-out",
          }}
        >
          <img
            src={currentImage}
            alt="preview"
            style={{
              maxWidth: "90%",
              maxHeight: "90%",
              boxShadow: "0 0 20px rgba(0,0,0,0.4)",
              transform: animateIn ? "scale(1)" : "scale(0.95)",
              opacity: animateIn ? 1 : 0,
              transition: "transform 300ms ease, opacity 300ms ease",
            }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}

export default ImageScrambler;
