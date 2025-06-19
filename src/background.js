const imageFormats = ["PNG", "JPEG", "SVG"];
const videoFormats = ["MP4", "WEBM", "MOV", "MKV"];
const audioFormats = ["MP3", "WAV"];

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "imageMenu",
    title: "Save Image As",
    contexts: ["image"],
  });

  imageFormats.forEach((format) => {
    chrome.contextMenus.create({
      id: `save_image_as_${format.toLowerCase()}`,
      title: `Save as ${format}`,
      parentId: "imageMenu",
      contexts: ["image"],
    });
  });
  
  chrome.contextMenus.create({
    id: "videoMenu",
    title: "Save Video As",
    contexts: ["video"],
  });

  videoFormats.forEach((format) => {
    chrome.contextMenus.create({
      id: `save_video_as_${format.toLowerCase()}`,
      title: `Save as ${format}`,
      parentId: "videoMenu",
      contexts: ["video"],
    });
  });
  chrome.contextMenus.create({
    id: "audioMenu",
    title: "Save Audio As",
    contexts: ["audio"],
  });

  audioFormats.forEach((format) => {
    chrome.contextMenus.create({
      id: `save_audio_as_${format.toLowerCase()}`,
      title: `Save as ${format}`,
      parentId: "audioMenu",
      contexts: ["audio"],
    });
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId.startsWith("save_image_as_")) {
    const format = info.menuItemId.replace("save_image_as_", "").toUpperCase();
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: downloadImage,
      args: [info.srcUrl, format],
    });
  } 
  else if (info.menuItemId.startsWith("save_video_as_")) {
    const format = info.menuItemId.replace("save_video_as_", "").toLowerCase();
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: downloadMedia,
      args: [info.srcUrl, format, "video"],
    });
  } 
  else if (info.menuItemId.startsWith("save_audio_as_")) {
    const format = info.menuItemId.replace("save_audio_as_", "").toLowerCase();
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: downloadMedia,
      args: [info.srcUrl, format, "audio"],
    });
  }
});

function downloadMedia(url, format, mediaType) {
  fetch(url)
    .then((response) => response.blob())
    .then((blob) => {
      const orgFN = url.split("/").pop().split("?")[0];
      const baseName = orgFN.split(".").slice(0, -1).join(".") || mediaType;
      const fileName = `${baseName}.${format}`;
      let mimeType = blob.type;
      if (mediaType === "video") {
        switch(format) {
          case "mp4":
            mimeType = "video/mp4";
            break;
          case "webm":
            mimeType = "video/webm";
            break;
          case "mov":
            mimeType = "video/quicktime";
            break;
          case "mkv":
            mimeType = "video/x-matroska";
            break;
        }
      }
      const newBlob = new Blob([blob], { type: mimeType });
      const downloadURL = URL.createObjectURL(newBlob);
      const a = document.createElement("a");
      a.href = downloadURL;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(downloadURL);
      }, 100);
    })
    .catch((error) => console.error(`Failed to fetch the ${mediaType}:`, error));
}

function downloadImage(url, format) {
  fetch(url)
    .then((response) => response.blob())
    .then((blob) => {
      const orgFN = url.split("/").pop().split("?")[0];
      const baseFN = orgFN.split(".").slice(0, -1).join(".") || "image";
      const fileName = `${baseFN}.${format.toLowerCase()}`;
      const downloadBlob = (blob, name) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      };

      if (format === "PNG" || format === "JPEG") {
        const img = new Image();
        img.src = URL.createObjectURL(blob);
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0);
          canvas.toBlob((convertedBlob) => {
            if (convertedBlob) downloadBlob(convertedBlob, fileName);
          }, `image/${format.toLowerCase()}`);
        };
      } else if (format === "SVG") {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Data = reader.result.split(",")[1];
          const svgData = `
            <svg xmlns="http://www.w3.org/2000/svg" width="500" height="500">
              <image href="data:image/png;base64,${base64Data}" width="500" height="500" />
            </svg>`;
          const svgBlob = new Blob([svgData], { type: "image/svg+xml" });
          downloadBlob(svgBlob, fileName);
        };
        reader.readAsDataURL(blob);
      }
    })
    .catch((error) => console.error("Failed to fetch the image:", error));
}
