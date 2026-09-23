import os
import math
import numpy as np
import cv2
from PIL import Image
from typing import Dict, Any, Tuple, Optional

class ImagePreprocessor:
    """
    OpenCV-based archival image preprocessing pipeline.
    Prepares scanned historical manuscripts, books, and photographs for OCR
    without permanently altering the original archival master file.
    """

    DEFAULT_CONFIG = {
        "target_dpi": 300,
        "grayscale": True,
        "deskew": True,
        "denoise": True,
        "contrast_clahe": True,
        "thresholding": False, # Set True for binary binarization
        "remove_borders": True
    }

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = {**self.DEFAULT_CONFIG, **(config or {})}

    def process_image(
        self, 
        input_image_path: str, 
        output_derivative_path: str
    ) -> Dict[str, Any]:
        """
        Executes the preprocessing pipeline on input_image_path and writes
        the derivative to output_derivative_path.
        Returns metrics: original dimensions, processed dimensions, skew angle, DPI.
        """
        if not os.path.exists(input_image_path):
            raise FileNotFoundError(f"Source image not found: {input_image_path}")

        # Ensure derivative directory exists
        os.makedirs(os.path.dirname(os.path.abspath(output_derivative_path)), exist_ok=True)

        # 1. Read image with OpenCV
        img = cv2.imread(input_image_path)
        if img is None:
            # Fallback to PIL in case of exotic color profiles or TIFF encodings
            pil_img = Image.open(input_image_path).convert("RGB")
            img = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)

        orig_h, orig_w = img.shape[:2]

        # Read original DPI if available from PIL
        original_dpi = 300
        try:
            with Image.open(input_image_path) as pimg:
                dpi_info = pimg.info.get('dpi')
                if dpi_info and isinstance(dpi_info, (tuple, list)):
                    original_dpi = int(dpi_info[0])
        except Exception:
            pass

        # 2. Grayscale conversion
        if self.config.get("grayscale", True):
            if len(img.shape) == 3 and img.shape[2] == 3:
                gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            else:
                gray = img
        else:
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY) if len(img.shape) == 3 else img

        # 3. Border removal / Margin trimming
        if self.config.get("remove_borders", True):
            gray = self._remove_borders(gray)

        # 4. Deskew
        skew_angle = 0.0
        if self.config.get("deskew", True):
            gray, skew_angle = self._deskew(gray)

        # 5. Denoise
        if self.config.get("denoise", True):
            # Bilateral filter preserves sharp text edges while smoothing scanner grain
            gray = cv2.bilateralFilter(gray, d=9, sigmaColor=75, sigmaSpace=75)

        # 6. Contrast enhancement (CLAHE: Contrast Limited Adaptive Histogram Equalization)
        if self.config.get("contrast_clahe", True):
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            gray = clahe.apply(gray)

        # 7. Adaptive thresholding (Optional, for faint inks or heavy foxing)
        if self.config.get("thresholding", False):
            gray = cv2.adaptiveThreshold(
                gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
            )

        processed_h, processed_w = gray.shape[:2]

        # 8. Save preprocessed derivative
        cv2.imwrite(output_derivative_path, gray)

        return {
            "original_width": orig_w,
            "original_height": orig_h,
            "processed_width": processed_w,
            "processed_height": processed_h,
            "dpi": original_dpi,
            "skew_angle": round(skew_angle, 2),
            "output_path": output_derivative_path,
            "config": self.config
        }

    def _remove_borders(self, gray: np.ndarray, border_fraction: float = 0.015) -> np.ndarray:
        """Trims dark scanner border bands without cropping textual margins."""
        h, w = gray.shape
        crop_y = int(h * border_fraction)
        crop_x = int(w * border_fraction)
        if crop_y > 0 and crop_x > 0 and (h - 2 * crop_y) > 100 and (w - 2 * crop_x) > 100:
            return gray[crop_y:h - crop_y, crop_x:w - crop_x]
        return gray

    def _deskew(self, gray: np.ndarray) -> Tuple[np.ndarray, float]:
        """Calculates text line orientation angle and rotates image if skew is detected."""
        try:
            # Invert grayscale for contour detection
            thresh = cv2.bitwise_not(gray)
            thresh = cv2.threshold(thresh, 0, 255, cv2.THRESH_BINARY | cv2.THRESH_OTSU)[1]

            coords = np.column_stack(np.where(thresh > 0))
            if len(coords) < 100:
                return gray, 0.0

            angle = cv2.minAreaRect(coords)[-1]

            # minAreaRect returns angle in [-90, 0)
            if angle < -45:
                angle = -(90 + angle)
            elif angle > 45:
                angle = angle - 90
            else:
                angle = -angle

            # Only rotate if skew is significant but realistic (between 0.5 and 20 degrees)
            if 0.5 < abs(angle) < 20.0:
                h, w = gray.shape[:2]
                center = (w // 2, h // 2)
                M = cv2.getRotationMatrix2D(center, angle, 1.0)
                rotated = cv2.warpAffine(
                    gray, M, (w, h), 
                    flags=cv2.INTER_CUBIC, 
                    borderMode=cv2.BORDER_REPLICATE
                )
                return rotated, float(angle)
        except Exception:
            pass

        return gray, 0.0
