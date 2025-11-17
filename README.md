# OpenCV YOLO Web Application

A web application for object detection using OpenCV and YOLO (You Only Look Once) model.

## Project Structure
```
Web OpenCv/
├── frontend/          # Web interface
│   ├── index.html    # Main HTML page
│   ├── style.css     # Styling
│   └── script.js     # JavaScript functionality
├── backend/          # Python Flask server
│   ├── app.py        # Main Flask application
│   └── requirements.txt # Python dependencies
├── models/           # Place your YOLO model here
│   └── best.pt       # Your trained YOLO model (add this file)
├── uploads/          # Temporary storage for uploaded images
└── package.json      # Node.js configuration
```

## Setup Instructions

### 1. Install Python Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### 2. Add Your YOLO Model
- Copy your `best.pt` file to the `models/` directory
- Make sure the file is named exactly `best.pt`

### 3. Start the Backend Server
```bash
cd backend
python app.py
```

### 4. Open the Frontend
- Navigate to the `frontend` folder
- Open `index.html` in your web browser
- Or use a local server:
```bash
# If you have Python installed
cd frontend
python -m http.server 8000
# Then open http://localhost:8000
```

## Usage

1. **Upload an Image**: 
   - Drag and drop an image onto the upload area
   - Or click the upload area to select a file

2. **Use Camera**:
   - Click "Use Camera" to access your webcam
   - Click "Capture Image" to take a photo for detection

3. **View Results**:
   - See detected objects with bounding boxes
   - View confidence scores for each detection

## API Endpoints

- `GET /` - API information
- `GET /health` - Check server health
- `POST /detect` - Upload image for detection

## Requirements

- Python 3.8+
- Modern web browser
- Webcam (optional, for camera features)
