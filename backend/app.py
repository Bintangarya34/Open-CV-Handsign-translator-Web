from flask import Flask, request, jsonify
from flask_cors import CORS
import cv2
import numpy as np
from ultralytics import YOLO
import base64
import io
from PIL import Image
import os

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Load YOLO model
MODEL_PATH = '../models/best.pt'
model = None

def load_model():
    global model
    try:
        if os.path.exists(MODEL_PATH):
            model = YOLO(MODEL_PATH)
            print(f"✅ Model loaded successfully from {MODEL_PATH}")
        else:
            print(f"❌ Model file not found at {MODEL_PATH}")
            print("Please place your best.pt file in the models/ directory")
    except Exception as e:
        print(f"❌ Error loading model: {str(e)}")

def preprocess_image(image_file):
    """Convert uploaded file to OpenCV format"""
    try:
        # Read image file
        image_stream = io.BytesIO(image_file.read())
        image = Image.open(image_stream)
        
        # Convert PIL Image to OpenCV format
        image_cv = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
        
        return image_cv
    except Exception as e:
        raise Exception(f"Error preprocessing image: {str(e)}")

def draw_detections(image, results):
    """Draw bounding boxes and labels on image"""
    try:
        # Create a copy of the image to draw on
        image_with_detections = image.copy()
        
        # Get the first result (assuming single image)
        if len(results) > 0:
            result = results[0]
            
            # Get boxes, confidences, and class names
            if result.boxes is not None:
                boxes = result.boxes.xyxy.cpu().numpy()  # x1, y1, x2, y2
                confidences = result.boxes.conf.cpu().numpy()
                classes = result.boxes.cls.cpu().numpy()
                
                # Draw each detection
                for i, (box, conf, cls) in enumerate(zip(boxes, confidences, classes)):
                    x1, y1, x2, y2 = map(int, box)
                    
                    # Get class name
                    class_name = model.names[int(cls)]
                    
                    # Choose color for the class
                    color = (0, 255, 0)  # Green
                    if int(cls) % 3 == 1:
                        color = (255, 0, 0)  # Blue
                    elif int(cls) % 3 == 2:
                        color = (0, 0, 255)  # Red
                    
                    # Draw bounding box
                    cv2.rectangle(image_with_detections, (x1, y1), (x2, y2), color, 2)
                    
                    # Draw label with confidence
                    label = f"{class_name}: {conf:.2f}"
                    label_size = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)[0]
                    
                    # Draw label background
                    cv2.rectangle(image_with_detections, 
                                (x1, y1 - label_size[1] - 10), 
                                (x1 + label_size[0], y1), 
                                color, -1)
                    
                    # Draw label text
                    cv2.putText(image_with_detections, label, 
                              (x1, y1 - 5), 
                              cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
        
        return image_with_detections
    except Exception as e:
        raise Exception(f"Error drawing detections: {str(e)}")

def extract_detection_info(results):
    """Extract detection information for JSON response"""
    detections = []
    
    try:
        if len(results) > 0:
            result = results[0]
            
            if result.boxes is not None:
                boxes = result.boxes.xyxy.cpu().numpy()
                confidences = result.boxes.conf.cpu().numpy()
                classes = result.boxes.cls.cpu().numpy()
                
                for box, conf, cls in zip(boxes, confidences, classes):
                    class_name = model.names[int(cls)]
                    
                    detections.append({
                        'class': class_name,
                        'confidence': float(conf),
                        'bbox': [float(coord) for coord in box]  # [x1, y1, x2, y2]
                    })
    except Exception as e:
        print(f"Error extracting detection info: {str(e)}")
    
    return detections

@app.route('/')
def home():
    return jsonify({
        'message': 'YOLO Object Detection API',
        'status': 'Model loaded' if model is not None else 'Model not loaded',
        'endpoints': {
            '/detect': 'POST - Upload image for detection',
            '/health': 'GET - Check API health'
        }
    })

@app.route('/health')
def health():
    return jsonify({
        'status': 'healthy',
        'model_loaded': model is not None
    })

@app.route('/detect', methods=['POST'])
def detect_objects():
    try:
        # Check if model is loaded
        if model is None:
            return jsonify({
                'success': False,
                'error': 'Model not loaded. Please check if best.pt exists in models/ directory'
            }), 500
        
        # Check if image file is provided
        if 'image' not in request.files:
            return jsonify({
                'success': False,
                'error': 'No image file provided'
            }), 400
        
        image_file = request.files['image']
        if image_file.filename == '':
            return jsonify({
                'success': False,
                'error': 'No image file selected'
            }), 400
        
        # Preprocess image
        image = preprocess_image(image_file)
        
        # Run YOLO detection
        results = model(image)
        
        # Draw detections on image
        image_with_detections = draw_detections(image, results)
        
        # Convert image to base64 for response
        _, buffer = cv2.imencode('.jpg', image_with_detections)
        image_base64 = base64.b64encode(buffer).decode('utf-8')
        
        # Extract detection information
        detections = extract_detection_info(results)
        
        return jsonify({
            'success': True,
            'image': image_base64,
            'detections': detections,
            'detection_count': len(detections)
        })
    
    except Exception as e:
        print(f"Error in detect_objects: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    print("🚀 Starting YOLO Object Detection Server...")
    print("📁 Loading model...")
    load_model()
    
    if model is not None:
        print("✅ Server ready!")
        print("🌐 Frontend: Open frontend/index.html in your browser")
        print("🔗 API: http://localhost:5000")
    else:
        print("⚠️  Server starting without model. Please add best.pt to models/ directory")
    
    app.run(debug=True, host='0.0.0.0', port=5000)