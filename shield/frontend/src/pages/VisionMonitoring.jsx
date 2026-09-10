import { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Camera,
  CheckCircle2,
  Crosshair,
  Eye,
  Image as ImageIcon,
  Loader2,
  RefreshCw,
  Upload,
  XCircle,
  Zap,
} from "lucide-react";

import PageHeader from "../components/common/PageHeader";
import StatusBadge from "../components/common/StatusBadge";

import {
  setLatestSnapshot,
  setLatestDetection,
  setDetectionHistory,
  setLoading,
  setError,
  clearError,
} from "../store/slices/detectionSlice";

import {
  analyzeDetectionImage,
  fetchDetectionHistory,
  base64ToImageFile,
} from "../services/detectionService";

import { fmtDateTime, fmtTime } from "../lib/utils";

const DEFECT_LABELS = {
  "Lubang Besar": "Large Hole",
  "Lubang Kecil": "Small Hole",
  "Sambungan Belt": "Belt Joint",
  "Sobekan Besar": "Large Tear",
  "Sobekan Kecil": "Small Tear",
};

const DEFECT_CLASSES = [
  "Lubang Besar",
  "Lubang Kecil",
  "Sambungan Belt",
  "Sobekan Besar",
  "Sobekan Kecil",
];

function getDetectionStatus(detection) {
  if (!detection) return "HEALTHY";

  if (detection.confidence >= 0.9) {
    return "DETECTED";
  }

  if (detection.confidence >= 0.6) {
    return "REVIEW";
  }

  return "LOW CONFIDENCE";
}

function getClassShortName(className) {
  if (!className) return "Unknown";

  return className;
}

function getBoxStyle(detection, imageWidth, imageHeight) {
  if (!detection?.bbox || !imageWidth || !imageHeight) {
    return {};
  }

  const { x1, y1, x2, y2 } = detection.bbox;

  return {
    left: `${(x1 / imageWidth) * 100}%`,
    top: `${(y1 / imageHeight) * 100}%`,
    width: `${((x2 - x1) / imageWidth) * 100}%`,
    height: `${((y2 - y1) / imageHeight) * 100}%`,
  };
}

function DetectionBox({
  detection,
  imageWidth,
  imageHeight,
  selected,
  onClick,
}) {
  const confidence = Math.round((detection.confidence || 0) * 100);

  return (
    <div
      className="absolute border-2 cursor-pointer transition-all"
      style={{
        ...getBoxStyle(detection, imageWidth, imageHeight),
        borderColor: selected
          ? "var(--color-critical)"
          : "var(--color-accent)",
        background: selected
          ? "rgba(244, 63, 94, 0.10)"
          : "rgba(56, 189, 248, 0.08)",
        boxShadow: selected
          ? "0 0 20px rgba(244, 63, 94, 0.30)"
          : "0 0 16px rgba(56, 189, 248, 0.20)",
        zIndex: selected ? 20 : 10,
      }}
      onClick={onClick}
      title={`${DEFECT_LABELS[detection.class_name] || detection.class_name} — ${confidence}%`}
    >
      <div
        className="absolute -top-7 left-0 px-2.5 py-1 rounded-md text-[10px] font-mono font-semibold whitespace-nowrap"
        style={{
          background: selected
            ? "var(--color-critical)"
            : "var(--color-accent)",
          color: "#06111F",
        }}
      >
        {getClassShortName(
          DEFECT_LABELS[detection.class_name] || detection.class_name
        )} · {confidence}%
      </div>

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <Crosshair
          size={22}
          className="text-accent opacity-80"
        />
      </div>
    </div>
  );
}

export default function VisionMonitoring() {

  const dispatch = useDispatch();

  const latestSnapshot = useSelector(
    (state) => state.detection.latestSnapshot
  );

  const liveSnapshotUrl = latestSnapshot?.image_base64
    ? `data:image/jpeg;base64,${latestSnapshot.image_base64}`
    : "";



  console.log("[VisionMonitoring] Latest snapshot:", {
    timestamp: latestSnapshot?.timestamp,
    resolution: latestSnapshot?.resolution,
    hasImage: Boolean(latestSnapshot?.image_base64),
    imageLength: latestSnapshot?.image_base64?.length || 0,
  });

  const {
    latestDetection,
    detectionHistory,
    loading,
    error,
  } = useSelector((state) => state.detection);


  // Existing image inspection state
  const cameraStreamRef = useRef(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [previewUrl, setPreviewUrl] = useState("");
  const [selectedFileName, setSelectedFileName] = useState("");
  const [imageDimensions, setImageDimensions] = useState({
    width: 0,
    height: 0,
  });

  const displayImageUrl = previewUrl || liveSnapshotUrl;
  const fileInputRef = useRef(null);

  const selectedDetection = useMemo(() => {
    if (!latestDetection?.detections?.length) {
      return null;
    }

    return (
      latestDetection.detections[selectedIndex] ||
      latestDetection.detections[0]
    );
  }, [latestDetection, selectedIndex]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);



  useEffect(() => {
    async function loadHistory() {
      try {
        const data = await fetchDetectionHistory();

        const history = Array.isArray(data)
          ? data
          : Array.isArray(data?.history)
            ? data.history
            : [];

        if (history.length > 0) {
          dispatch(setDetectionHistory(history));
        }
      } catch {
        // History is optional during initial frontend integration.
        // Do not block the Vision page if it is unavailable.
      }
    }

    loadHistory();
  }, [dispatch]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [latestDetection?.id]);


  const handleTestSnapshot = (file) => {
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result;

      if (typeof result !== "string") {
        console.error("[TestSnapshot] Unable to read image.");
        return;
      }

      const base64 = result.includes(",")
        ? result.split(",")[1]
        : result;

      dispatch(
        setLatestSnapshot({
          device_id: "CB_001",
          image_base64: base64,
          resolution: "QVGA",
          timestamp: Date.now(),
        })
      );

      console.log("[TestSnapshot] Snapshot injected:", {
        imageLength: base64.length,
        timestamp: Date.now(),
      });
    };

    reader.readAsDataURL(file);
  };





  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      dispatch(setError("Please select a valid image file."));
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    const newPreviewUrl = URL.createObjectURL(file);

    setPreviewUrl(newPreviewUrl);
    setSelectedFileName(file.name);

    dispatch(clearError());
    dispatch(setLoading(true));

    try {
      const result = await analyzeDetectionImage(file);

      dispatch(setLatestDetection(result));
    } catch (err) {
      dispatch(
        setError(
          err?.message ||
          "Unable to analyze the selected image."
        )
      );
    } finally {
      dispatch(setLoading(false));
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleClearImage = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setPreviewUrl("");
    setSelectedFileName("");
    setImageDimensions({
      width: 0,
      height: 0,
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleImageLoad = (event) => {
    setImageDimensions({
      width: event.currentTarget.naturalWidth,
      height: event.currentTarget.naturalHeight,
    });
  };

  const detectionCount = latestDetection?.count || 0;

  const history = detectionHistory || [];

  return (
    <div className="space-y-7 pb-10 max-w-7xl mx-auto">

      {/* =========================================================
          PAGE HEADER
      ========================================================= */}

      <PageHeader
        title="Vision Inspection"
        subtitle="YOLOv8-powered conveyor belt defect detection and visual inspection"
        statusBadge={
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-tech font-medium"
            style={{
              background: "rgba(16, 185, 129, 0.1)",
              color: "var(--color-healthy)",
              border: "1px solid var(--color-healthy-border)",
            }}
          >
            <span className="w-2 h-2 rounded-full bg-status-healthy animate-pulse" />
            <span>YOLO Vision Service</span>
          </div>
        }
      />

      {/* =========================================================
          CONTROL BAR
      ========================================================= */}

      <div
        className="p-4 rounded-2xl border flex flex-col md:flex-row md:items-center md:justify-between gap-4 card-modern"
        style={{
          background: "var(--color-surface)",
          borderColor: "var(--color-border)",
          boxShadow: "0 8px 24px -4px rgba(0, 0, 0, 0.25)",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              background: "rgba(56, 189, 248, 0.10)",
              color: "var(--color-accent)",
            }}
          >
            <Camera size={20} />
          </div>

          <div>
            <div className="text-sm font-display font-semibold text-main">
              Conveyor Image Inspection
            </div>

            <div className="text-xs text-muted">
              Upload a conveyor frame for real YOLOv8 inference
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            className="hidden"
          />



          <button
            onClick={handleUploadClick}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl text-xs font-tech font-semibold flex items-center gap-2 transition-all hover:opacity-90 disabled:opacity-50 cursor-pointer"
            style={{
              background:
                "linear-gradient(135deg, var(--color-accent) 0%, #0284C7 100%)",
              color: "#080E1A",
            }}
          >
            {loading ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Upload size={15} />
            )}

            {loading ? "Analyzing..." : "Inspect Image"}
          </button>


          <button
            onClick={() => {
              const input = document.createElement("input");
              input.type = "file";
              input.accept = "image/jpeg,image/png,image/webp";

              input.onchange = (event) => {
                const file = event.target.files?.[0];

                if (file) {
                  handleTestSnapshot(file);
                }
              };

              input.click();
            }}
            className="px-4 py-2.5 rounded-xl text-xs font-tech font-semibold flex items-center gap-2 transition-all hover:opacity-90 cursor-pointer"
            style={{
              background: "rgba(245, 158, 11, 0.12)",
              color: "var(--color-warning)",
              border: "1px solid var(--color-warning-border)",
            }}
          >
            Test Snapshot
          </button>


          {previewUrl && (
            <button
              onClick={handleClearImage}
              disabled={loading}
              className="px-3 py-2.5 rounded-xl border text-xs font-tech flex items-center gap-2 hover:bg-white/[0.03] transition-all cursor-pointer"
              style={{
                borderColor: "var(--color-border)",
                color: "var(--color-muted)",
              }}
            >
              <XCircle size={15} />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* =========================================================
          ERROR
      ========================================================= */}

      {error && (
        <div
          className="p-4 rounded-xl border flex items-start gap-3"
          style={{
            background: "rgba(244, 63, 94, 0.08)",
            borderColor: "var(--color-critical-border)",
          }}
        >
          <XCircle
            size={18}
            className="text-critical mt-0.5 shrink-0"
          />

          <div>
            <div className="text-xs font-tech font-semibold text-critical">
              Vision Service Error
            </div>

            <div className="text-xs text-muted mt-1">
              {error}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          MAIN VIEWPORT + DIAGNOSTICS
      ========================================================= */}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

        {/* =======================================================
            IMAGE VIEWPORT
        ======================================================= */}

        <div
          className="lg:col-span-8 p-6 rounded-2xl border flex flex-col card-modern"
          style={{
            background: "var(--color-surface)",
            borderColor: "var(--color-border)",
            boxShadow: "0 8px 24px -4px rgba(0, 0, 0, 0.35)",
          }}
        >

          {/* Top bar */}

          <div className="flex items-center justify-between mb-3 text-xs">
            <div className="flex items-center gap-2.5">
              <span className="font-display font-semibold text-main text-sm">
                Optical Inspection View
              </span>

              {selectedFileName && (
                <span
                  className="text-[11px] font-tech font-medium px-2.5 py-0.5 rounded-full truncate max-w-[220px]"
                  style={{
                    background: "rgba(56, 189, 248, 0.1)",
                    color: "var(--color-accent)",
                    border:
                      "1px solid rgba(56, 189, 248, 0.2)",
                  }}
                  title={selectedFileName}
                >
                  {selectedFileName}
                </span>
              )}
            </div>

            <div
              className="flex items-center gap-2 font-tech text-xs"
              style={{
                color: loading
                  ? "var(--color-warning)"
                  : previewUrl
                    ? "var(--color-healthy)"
                    : liveSnapshotUrl
                      ? "var(--color-healthy)"
                      : "var(--color-muted)",
              }}
            >
              <span
                className={`w-2 h-2 rounded-full ${loading
                  ? "bg-status-warning"
                  : previewUrl || liveSnapshotUrl
                    ? "bg-status-healthy"
                    : "bg-slate-500"
                  }`}
              />

              <span className="font-semibold tracking-wider">
                {loading
                  ? "PROCESSING"
                  : previewUrl
                    ? "MANUAL"
                    : liveSnapshotUrl
                      ? "LIVE"
                      : "WAITING"}
              </span>
            </div>
          </div>

          {/* Viewport */}

          <div
            className="relative w-full rounded-xl border overflow-hidden flex items-center justify-center min-h-[430px]"
            style={{
              background:
                "radial-gradient(circle at center, #0F172A 0%, #080D1A 100%)",
              borderColor: "var(--color-border)",
            }}
          >

            {!displayImageUrl && (
              <>
                <div
                  className="absolute inset-0 opacity-15 pointer-events-none"
                  style={{
                    backgroundImage:
                      "repeating-linear-gradient(0deg, #38BDF8 0px, #38BDF8 1px, transparent 1px, transparent 24px), repeating-linear-gradient(90deg, #38BDF8 0px, #38BDF8 1px, transparent 1px, transparent 24px)",
                  }}
                />

                <div className="relative z-10 text-center">
                  <div
                    className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                    style={{
                      background: "rgba(56, 189, 248, 0.08)",
                      border:
                        "1px solid rgba(56, 189, 248, 0.15)",
                    }}
                  >
                    <ImageIcon
                      size={28}
                      className="text-accent"
                    />
                  </div>

                  <div className="text-sm font-display font-semibold text-main">
                    No inspection frame selected
                  </div>

                  <div className="text-xs text-muted mt-1">
                    Upload a conveyor image to run YOLOv8 inference
                  </div>

                  <button
                    onClick={handleUploadClick}
                    className="mt-5 px-4 py-2 rounded-lg border text-xs font-tech font-semibold text-accent hover:bg-accent/10 transition-all cursor-pointer"
                    style={{
                      borderColor: "var(--color-accent)",
                    }}
                  >
                    Select Image
                  </button>
                </div>
              </>
            )}

            {displayImageUrl && (
              <div className="relative w-full h-full min-h-[430px] flex items-center justify-center bg-black/20">

                <img
                  src={displayImageUrl}
                  alt="Conveyor inspection frame"
                  onLoad={handleImageLoad}
                  className="block max-w-full max-h-[520px] object-contain"
                />

                {/* YOLO bounding boxes */}

                {imageDimensions.width > 0 &&
                  imageDimensions.height > 0 &&
                  latestDetection?.detections?.map(
                    (detection, index) => (
                      <DetectionBox
                        key={`${latestDetection.id || "det"}-${index}`}
                        detection={detection}
                        imageWidth={imageDimensions.width}
                        imageHeight={imageDimensions.height}
                        selected={
                          selectedIndex === index
                        }
                        onClick={() =>
                          setSelectedIndex(index)
                        }
                      />
                    )
                  )}

                {/* Loading overlay */}

                {loading && (
                  <div
                    className="absolute inset-0 flex items-center justify-center backdrop-blur-sm"
                    style={{
                      background:
                        "rgba(2, 8, 23, 0.60)",
                    }}
                  >
                    <div className="text-center">
                      <Loader2
                        size={34}
                        className="mx-auto text-accent animate-spin"
                      />

                      <div className="mt-3 text-sm font-display font-semibold text-main">
                        Running YOLOv8 inference
                      </div>

                      <div className="text-xs text-muted mt-1">
                        Analyzing conveyor surface...
                      </div>
                    </div>
                  </div>
                )}

                {/* Empty detection state */}

                {!loading &&
                  latestDetection &&
                  detectionCount === 0 && (
                    <div
                      className="absolute inset-x-6 bottom-6 flex justify-center pointer-events-none"
                    >
                      <div
                        className="px-4 py-2.5 rounded-xl border flex items-center gap-2 text-xs font-tech font-semibold"
                        style={{
                          background:
                            "rgba(16, 185, 129, 0.12)",
                          borderColor:
                            "var(--color-healthy-border)",
                          color:
                            "var(--color-healthy)",
                        }}
                      >
                        <CheckCircle2 size={16} />
                        No defects detected
                      </div>
                    </div>
                  )}
              </div>
            )}

            {/* Viewport watermark */}

            {latestDetection && (
              <div className="absolute bottom-3 right-4 text-[10px] font-mono text-muted pointer-events-none">
                Inference:{" "}
                {latestDetection.inference_ms ?? "—"} ms · YOLOv8
              </div>
            )}
          </div>

          {/* Viewport footer */}

          <div className="flex items-center justify-between pt-4 text-xs text-muted">

            <span className="flex items-center gap-1.5">
              <Zap size={14} className="text-accent" />

              <span>
                Object detection powered by trained YOLOv8 model.
              </span>
            </span>

            <span className="font-mono text-[11px]">
              {latestDetection
                ? `${detectionCount} detection${detectionCount === 1 ? "" : "s"
                }`
                : "No result"}
            </span>
          </div>
        </div>

        {/* =======================================================
            DIAGNOSTICS
        ======================================================= */}

        <div
          className="lg:col-span-4 p-6 rounded-2xl border flex flex-col card-modern"
          style={{
            background: "var(--color-surface)",
            borderColor: "var(--color-border)",
            boxShadow: "0 8px 24px -4px rgba(0, 0, 0, 0.35)",
          }}
        >

          <div className="space-y-4">

            <div
              className="flex items-center justify-between border-b pb-3"
              style={{
                borderColor:
                  "var(--color-border-subtle)",
              }}
            >
              <div>
                <h4 className="text-sm font-display font-semibold text-main">
                  Defect Diagnostics
                </h4>

                <p className="text-xs text-muted">
                  Actual YOLOv8 inference output
                </p>
              </div>

              <StatusBadge
                status={
                  selectedDetection
                    ? getDetectionStatus(
                      selectedDetection
                    )
                    : "HEALTHY"
                }
              />
            </div>

            {selectedDetection ? (
              <div className="space-y-3.5 text-xs">

                {/* Classification */}

                <div
                  className="p-3.5 rounded-xl border"
                  style={{
                    background:
                      "rgba(255, 255, 255, 0.02)",
                    borderColor:
                      "var(--color-border-subtle)",
                  }}
                >
                  <div className="text-[10px] text-muted font-tech uppercase tracking-wider font-semibold">
                    Defect Classification
                  </div>

                  <div className="text-base font-display font-bold text-main mt-0.5">
                    {DEFECT_LABELS[selectedDetection.class_name] || selectedDetection.class_name}
                  </div>

                  <div className="text-xs text-muted mt-1">
                    YOLOv8 detected this object in the inspection
                    frame.
                  </div>
                </div>

                {/* Confidence / class ID */}

                <div className="grid grid-cols-2 gap-3">

                  <div
                    className="p-3 rounded-xl border"
                    style={{
                      background:
                        "rgba(255, 255, 255, 0.02)",
                      borderColor:
                        "var(--color-border-subtle)",
                    }}
                  >
                    <span className="text-[10px] text-muted block font-tech">
                      AI CONFIDENCE
                    </span>

                    <span className="text-lg font-mono font-bold text-accent">
                      {Math.round(
                        (selectedDetection.confidence ||
                          0) * 100
                      )}
                      %
                    </span>
                  </div>

                  <div
                    className="p-3 rounded-xl border"
                    style={{
                      background:
                        "rgba(255, 255, 255, 0.02)",
                      borderColor:
                        "var(--color-border-subtle)",
                    }}
                  >
                    <span className="text-[10px] text-muted block font-tech">
                      CLASS ID
                    </span>

                    <span className="text-lg font-mono font-bold text-main">
                      {selectedDetection.class_id}
                    </span>
                  </div>
                </div>

                {/* Bounding box */}

                <div
                  className="p-3.5 rounded-xl border"
                  style={{
                    background:
                      "rgba(255, 255, 255, 0.02)",
                    borderColor:
                      "var(--color-border-subtle)",
                  }}
                >
                  <div className="text-[10px] text-muted font-tech uppercase tracking-wider font-semibold mb-2">
                    Bounding Box
                  </div>

                  <div className="grid grid-cols-2 gap-y-2 text-[11px] font-mono">
                    <span className="text-muted">
                      X1
                    </span>
                    <span className="text-main text-right">
                      {selectedDetection.bbox?.x1 ?? "—"}
                    </span>

                    <span className="text-muted">
                      Y1
                    </span>
                    <span className="text-main text-right">
                      {selectedDetection.bbox?.y1 ?? "—"}
                    </span>

                    <span className="text-muted">
                      X2
                    </span>
                    <span className="text-main text-right">
                      {selectedDetection.bbox?.x2 ?? "—"}
                    </span>

                    <span className="text-muted">
                      Y2
                    </span>
                    <span className="text-main text-right">
                      {selectedDetection.bbox?.y2 ?? "—"}
                    </span>
                  </div>
                </div>

                {/* Technical information */}

                <div
                  className="space-y-2 pt-2 border-t font-mono text-xs"
                  style={{
                    borderColor:
                      "var(--color-border-subtle)",
                  }}
                >
                  <div className="flex justify-between">
                    <span className="text-muted">
                      Detected:
                    </span>

                    <span className="text-main">
                      {latestDetection?.timestamp
                        ? fmtTime(
                          new Date(
                            latestDetection.timestamp
                          )
                        )
                        : "—"}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-muted">
                      Inference:
                    </span>

                    <span className="text-accent">
                      {latestDetection?.inference_ms ?? "—"} ms
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-muted">
                      Image:
                    </span>

                    <span className="text-main">
                      {latestDetection?.image?.width ?? "—"} ×{" "}
                      {latestDetection?.image?.height ?? "—"}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-muted">
                      Model:
                    </span>

                    <span className="text-main">
                      {latestDetection?.model?.name ||
                        "best.pt"}
                    </span>
                  </div>
                </div>

              </div>
            ) : (
              <div className="py-16 text-center text-muted">
                <Eye
                  size={28}
                  className="mx-auto mb-3 text-accent"
                />

                <div className="text-sm font-display font-semibold text-main">
                  No defect selected
                </div>

                <div className="text-xs mt-1">
                  Run an image inspection to view YOLO
                  detection details.
                </div>
              </div>
            )}
          </div>

          {/* Detection summary */}

          {latestDetection && (
            <div
              className="mt-auto pt-4 border-t"
              style={{
                borderColor:
                  "var(--color-border-subtle)",
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted font-tech">
                  DETECTIONS IN FRAME
                </span>

                <span className="text-xl font-mono font-bold text-accent">
                  {detectionCount}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* =========================================================
          MODEL CLASSES
      ========================================================= */}

      <div
        className="rounded-2xl border overflow-hidden card-modern"
        style={{
          background: "var(--color-surface)",
          borderColor: "var(--color-border)",
          boxShadow: "0 8px 24px -4px rgba(0, 0, 0, 0.25)",
        }}
      >
        <div
          className="p-5 border-b flex items-center justify-between"
          style={{
            borderColor:
              "var(--color-border-subtle)",
          }}
        >
          <div>
            <h4 className="text-sm font-display font-semibold text-main">
              Detection Classes
            </h4>

            <p className="text-xs text-muted">
              Classes trained in the SmartConveyor YOLOv8 model
            </p>
          </div>

          <span className="text-xs font-tech text-muted">
            {DEFECT_CLASSES.length} Classes
          </span>
        </div>

        <div className="p-5 grid grid-cols-2 md:grid-cols-5 gap-3">
          {DEFECT_CLASSES.map((className) => (
            <div
              key={className}
              className="p-3 rounded-xl border"
              style={{
                background:
                  "rgba(255, 255, 255, 0.02)",
                borderColor:
                  "var(--color-border-subtle)",
              }}
            >
              <div className="text-xs font-display font-semibold text-main">
                {DEFECT_LABELS[className] || className}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* =========================================================
          DETECTION HISTORY
      ========================================================= */}

      <div
        className="rounded-2xl border overflow-hidden card-modern"
        style={{
          background: "var(--color-surface)",
          borderColor: "var(--color-border)",
          boxShadow: "0 8px 24px -4px rgba(0, 0, 0, 0.35)",
        }}
      >

        <div
          className="p-5 border-b flex items-center justify-between"
          style={{
            borderColor:
              "var(--color-border-subtle)",
          }}
        >
          <div>
            <h4 className="text-sm font-display font-semibold text-main">
              Defect Inspection Log
            </h4>

            <p className="text-xs text-muted">
              Recent YOLOv8 inspection results
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-tech text-muted">
              {history.length} Recorded Events
            </span>

            <RefreshCw
              size={14}
              className="text-muted"
            />
          </div>
        </div>

        {history.length === 0 ? (
          <div className="py-12 text-center text-muted">
            <CheckCircle2
              size={24}
              className="mx-auto mb-2 text-accent"
            />

            <div className="text-xs">
              No inspection events recorded yet.
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">

            <table className="w-full text-left text-xs">

              <thead>
                <tr
                  style={{
                    borderBottom:
                      "1px solid var(--color-border)",
                    background:
                      "rgba(255, 255, 255, 0.01)",
                  }}
                >
                  {[
                    "Detection Time",
                    "Classification",
                    "Confidence",
                    "Detections",
                    "Inference",
                    "Action",
                  ].map((header) => (
                    <th
                      key={header}
                      className="px-5 py-3.5 font-tech font-semibold text-muted text-xs tracking-wider"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody
                className="divide-y"
                style={{
                  borderColor:
                    "var(--color-border-subtle)",
                }}
              >
                {history.map((item, index) => {
                  const firstDetection =
                    item?.detections?.[0];

                  return (
                    <tr
                      key={item.id || index}
                      onClick={() => {
                        dispatch(
                          setLatestDetection(item)
                        );

                        if (firstDetection) {
                          setSelectedIndex(0);
                        }
                      }}
                      className="transition-colors cursor-pointer hover:bg-white/[0.02]"
                      style={{
                        background:
                          latestDetection?.id === item.id
                            ? "rgba(56, 189, 248, 0.07)"
                            : "transparent",
                      }}
                    >
                      <td className="px-5 py-3.5 font-mono text-muted">
                        {item.timestamp
                          ? fmtDateTime(
                            new Date(item.timestamp)
                          )
                          : "—"}
                      </td>

                      <td className="px-5 py-3.5 font-display font-semibold text-main">
                        {(firstDetection?.class_name
                          ? DEFECT_LABELS[firstDetection.class_name] || firstDetection.class_name
                          : "No defects")}
                      </td>

                      <td className="px-5 py-3.5 font-mono text-main">
                        {firstDetection
                          ? `${Math.round(
                            firstDetection.confidence *
                            100
                          )}%`
                          : "—"}
                      </td>

                      <td className="px-5 py-3.5 font-mono text-accent">
                        {item.count ?? 0}
                      </td>

                      <td className="px-5 py-3.5 font-mono text-main">
                        {item.inference_ms ?? "—"} ms
                      </td>

                      <td className="px-5 py-3.5">
                        <button
                          onClick={(event) => {
                            event.stopPropagation();

                            dispatch(
                              setLatestDetection(item)
                            );

                            setSelectedIndex(0);
                          }}
                          className="px-3 py-1 rounded-lg text-xs font-tech font-medium border transition-all hover:bg-accent hover:text-black cursor-pointer"
                          style={{
                            borderColor:
                              "var(--color-accent)",
                            color:
                              "var(--color-accent)",
                          }}
                        >
                          Inspect Frame
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

            </table>
          </div>
        )}
      </div>
    </div>
  );
}