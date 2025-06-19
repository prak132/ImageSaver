document.addEventListener("DOMContentLoaded", function () {
  const mediaUpload = document.getElementById("mediaUpload");
  const imagePreview = document.getElementById("imagePreview");
  const videoPreview = document.getElementById("videoPreview");
  const audioPreview = document.getElementById("audioPreview");
  const uploadPrompt = document.getElementById("uploadPrompt");
  const dropArea = document.getElementById("dropArea");
  const convertBtn = document.getElementById("convertBtn");
  const imageFormats = document.getElementById("imageFormats");
  const videoFormats = document.getElementById("videoFormats");
  const audioFormats = document.getElementById("audioFormats");
  const themeToggle = document.getElementById("themeToggle");
  const sunIcon = themeToggle.querySelector(".sun-icon");
  const moonIcon = themeToggle.querySelector(".moon-icon");
  const errorContainer = document.getElementById("errorContainer");
  let mediaFile = null;
  let mediaType = null;
  function loadThemePreference() {
    chrome.storage.local.get(['darkMode'], function(result) {
      if (result.darkMode) {
        document.body.classList.add('dark-theme');
        sunIcon.style.display = 'none';
        moonIcon.style.display = 'block';
      } else {
        document.body.classList.remove('dark-theme');
        sunIcon.style.display = 'block';
        moonIcon.style.display = 'none';
      }
    });
  }
  loadThemePreference();
  themeToggle.addEventListener("click", function() {
    const isDarkMode = document.body.classList.contains('dark-theme');
    
    if (isDarkMode) {
      document.body.classList.remove('dark-theme');
      sunIcon.style.display = 'block';
      moonIcon.style.display = 'none';
      chrome.storage.local.set({darkMode: false});
    } else {
      document.body.classList.add('dark-theme');
      sunIcon.style.display = 'none';
      moonIcon.style.display = 'block';
      chrome.storage.local.set({darkMode: true});
    }
  });

  function showError(message, timeout = 5000) {
    errorContainer.textContent = message;
    errorContainer.style.display = 'block';
    
    if (timeout > 0) {
      setTimeout(() => {
        errorContainer.style.display = 'none';
      }, timeout);
    }
  }

  function clearError() {
    errorContainer.style.display = 'none';
  }

  mediaUpload.addEventListener("change", handleFileSelect);

  dropArea.addEventListener("dragover", function (e) {
    e.preventDefault();
    e.stopPropagation();
    dropArea.classList.add("dragover");
  });

  dropArea.addEventListener("dragleave", function (e) {
    e.preventDefault();
    e.stopPropagation();
    dropArea.classList.remove("dragover");
  });

  dropArea.addEventListener("drop", function (e) {
    e.preventDefault();
    e.stopPropagation();
    dropArea.classList.remove("dragover");

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      handleFile(file);
    }
  });

  convertBtn.addEventListener("click", convertAndDownload);

  function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
      handleFile(file);
    }
  }

  function handleFile(file) {
    mediaFile = file;
    
    clearError();
    
    imagePreview.style.display = "none";
    videoPreview.style.display = "none";
    audioPreview.style.display = "none";
    imageFormats.style.display = "none";
    videoFormats.style.display = "none";
    audioFormats.style.display = "none";
    if (file.type.match("image.*")) {
      mediaType = "image";
      imageFormats.style.display = "flex";
      imageFormats.querySelector('input[type="radio"]').checked = true;
      
      const reader = new FileReader();
      reader.onload = function (e) {
        imagePreview.src = e.target.result;
        imagePreview.style.display = "block";
        uploadPrompt.style.display = "none";
        convertBtn.disabled = false;
      };
      reader.onerror = function (e) {
        showError("Error reading image file: " + file.name);
        console.error("FileReader error:", e);
      };
      reader.readAsDataURL(file);
      
    } else if (file.type.match("video.*")) {
      mediaType = "video";
      videoFormats.style.display = "flex";
      videoFormats.querySelector('input[type="radio"]').checked = true;
      
      try {
        const url = URL.createObjectURL(file);
        videoPreview.src = url;
        videoPreview.style.display = "block";
        uploadPrompt.style.display = "none";
        convertBtn.disabled = false;
        videoPreview.onerror = function() {
          showError("Error loading video: " + file.name);
          URL.revokeObjectURL(url);
        };
      } catch (error) {
        showError("Error processing video file: " + error.message);
        console.error("Video processing error:", error);
      }
      
    } else if (file.type.match("audio.*")) {
      mediaType = "audio";
      audioFormats.style.display = "flex";
      audioFormats.querySelector('input[type="radio"]').checked = true;
      
      try {
        const url = URL.createObjectURL(file);
        audioPreview.src = url;
        audioPreview.style.display = "block";
        uploadPrompt.style.display = "none";
        convertBtn.disabled = false;
        audioPreview.onerror = function() {
          showError("Error loading audio: " + file.name);
          URL.revokeObjectURL(url);
        };
      } catch (error) {
        showError("Error processing audio file: " + error.message);
        console.error("Audio processing error:", error);
      }
    } else {
      showError("Unsupported file type. Please upload an image, video, or audio file.");
    }
  }

  function convertAndDownload() {
    if (!mediaFile) {
      showError("No file selected. Please upload a file first.");
      return;
    }
    clearError();

    try {
      const selectedFormat = document
        .querySelector('input[name="format"]:checked')
        .value.toLowerCase();
      if (mediaType === "image") {
        convertAndDownloadImage(selectedFormat);
      } 
      else if (mediaType === "video") {
        convertAndDownloadMedia(selectedFormat, "video");
      } 
      else if (mediaType === "audio") {
        convertAndDownloadMedia(selectedFormat, "audio");
      }
    } catch (error) {
      showError("Error during conversion: " + error.message);
      console.error("Conversion error:", error);
    }
  }
  
  function convertAndDownloadImage(selectedFormat) {
    const reader = new FileReader();

    reader.onloadend = function () {
      try {
        const blob = new Blob([reader.result]);

        const img = new Image();
        img.src = URL.createObjectURL(blob);
        img.onerror = function() {
          showError("Error processing image for conversion");
          URL.revokeObjectURL(img.src);
        };
        
        img.onload = () => {
          try {
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0);

            if (selectedFormat === "png" || selectedFormat === "jpeg") {
              canvas.toBlob((convertedBlob) => {
                if (convertedBlob) {
                  const baseName =
                    mediaFile.name.split(".").slice(0, -1).join(".") || "image";
                  const fileName = `${baseName}.${selectedFormat}`;
                  downloadBlob(convertedBlob, fileName);
                } else {
                  showError(`Failed to convert to ${selectedFormat} format`);
                }
              }, `image/${selectedFormat}`);
            } else if (selectedFormat === "svg") {
              const imgReader = new FileReader();
              imgReader.onloadend = () => {
                try {
                  const base64Data = imgReader.result.split(",")[1];
                  const svgData = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="${img.width}" height="${img.height}">
                      <image href="data:image/png;base64,${base64Data}" width="${img.width}" height="${img.height}" />
                    </svg>`;
                  const svgBlob = new Blob([svgData], { type: "image/svg+xml" });
                  const baseName =
                    mediaFile.name.split(".").slice(0, -1).join(".") || "image";
                  const fileName = `${baseName}.svg`;
                  downloadBlob(svgBlob, fileName);
                } catch (error) {
                  showError("Error creating SVG: " + error.message);
                  console.error("SVG creation error:", error);
                }
              };
              imgReader.onerror = function() {
                showError("Error reading image data for SVG conversion");
              };
              canvas.toBlob((blob) => {
                if (blob) {
                  imgReader.readAsDataURL(blob);
                } else {
                  showError("Failed to process image for SVG conversion");
                }
              }, "image/png");
            }
          } catch (error) {
            showError("Error processing image: " + error.message);
            console.error("Canvas drawing error:", error);
          }
        };
      } catch (error) {
        showError("Error preparing image: " + error.message);
        console.error("Image preparation error:", error);
      }
    };

    reader.onerror = function() {
      showError("Error reading file for conversion");
    };

    reader.readAsArrayBuffer(mediaFile);
  }
  
  function convertAndDownloadMedia(selectedFormat, mediaTypeStr) {
    const reader = new FileReader();
    reader.onloadend = function() {
      try {
        const blob = new Blob([reader.result]);
        const baseName = mediaFile.name.split(".").slice(0, -1).join(".") || mediaTypeStr;
        const fileName = `${baseName}.${selectedFormat}`;
        downloadBlob(blob, fileName);
        let formatInfo = "";
        if (mediaTypeStr === "video") {
          switch(selectedFormat) {
            case "mp4":
              formatInfo = "MP4 is widely supported by most devices and platforms.";
              break;
            case "webm":
              formatInfo = "WebM offers good compression and is well-supported in web browsers.";
              break;
            case "mov":
              formatInfo = "MOV is commonly used on Apple devices and in professional video editing.";
              break;
            case "mkv":
              formatInfo = "MKV supports multiple audio/video tracks and subtitles in a single file.";
              break;
          }
        }
        
        // const existingNotes = document.querySelectorAll(".conversion-note");
        // existingNotes.forEach(note => {
        //   if (note.parentNode) {
        //     note.parentNode.removeChild(note);
        //   }
        // });
        
        // const note = document.createElement("div");
        // note.className = "conversion-note";
        // document.querySelector(".container").appendChild(note);
        // setTimeout(() => {
        //   if (note.parentNode) {
        //     note.parentNode.removeChild(note);
        //   }
        // }, 7000);
      } catch (error) {
        showError("Error processing media file: " + error.message);
        console.error("Media processing error:", error);
      }
    };
    
    reader.onerror = function() {
      showError(`Error reading ${mediaTypeStr} file for conversion`);
    };
    
    reader.readAsArrayBuffer(mediaFile);
  }

  function downloadBlob(blob, name) {
    try {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
    } catch (error) {
      showError("Error downloading file: " + error.message);
      console.error("Download error:", error);
    }
  }
});
