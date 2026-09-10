const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:3001";

export async function analyzeDetectionImage(file) {
    if (!file) {
        throw new Error("No image selected.");
    }

    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(
        `${API_BASE_URL}/api/detections/analyze`,
        {
            method: "POST",
            body: formData,
        }
    );

    let data;

    try {
        data = await response.json();
    } catch {
        throw new Error(
            `Backend returned an invalid response (${response.status}).`
        );
    }

    if (!response.ok || !data.success) {
        throw new Error(
            data?.error ||
            data?.message ||
            `Detection failed (${response.status}).`
        );
    }

    return data;
}

export async function fetchDetectionHistory() {
    const response = await fetch(
        `${API_BASE_URL}/api/detections/history`
    );

    let data;

    try {
        data = await response.json();
    } catch {
        throw new Error(
            `Backend returned an invalid response (${response.status}).`
        );
    }

    if (!response.ok) {
        throw new Error(
            data?.error ||
            data?.message ||
            `Unable to load detection history (${response.status}).`
        );
    }

    return data;
}

export async function fetchLatestDetection() {
    const response = await fetch(
        `${API_BASE_URL}/api/detections/latest`
    );

    let data;

    try {
        data = await response.json();
    } catch {
        throw new Error(
            `Backend returned an invalid response (${response.status}).`
        );
    }

    if (!response.ok) {
        throw new Error(
            data?.error ||
            data?.message ||
            `Unable to load latest detection (${response.status}).`
        );
    }

    return data;
}

export function base64ToImageFile(base64, filename = "snapshot.jpg") {
    if (!base64) {
        throw new Error("No Base64 image provided.");
    }

    const cleanBase64 = base64.includes(",")
        ? base64.split(",")[1]
        : base64;

    const binaryString = atob(cleanBase64);
    const bytes = new Uint8Array(binaryString.length);

    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }

    const blob = new Blob([bytes], {
        type: "image/jpeg",
    });

    return new File([blob], filename, {
        type: "image/jpeg",
    });
}