# 📱 PhonePro – Your Smart Phone Recommendation System

**PhonePro** is a Streamlit-based web application that recommends the best smartphone for you based on your personal preferences like budget, brand, camera specs, OS, battery life, and more. It uses intelligent feature weighting and cosine similarity to offer accurate recommendations from a real-world dataset.

---

## 🚀 Live Demo

👉 [Visit the Deployed App on Render](https://your-app-url.onrender.com)

---

## 🎯 Features

- 🔍 **Personalized Phone Suggestions** using weighted feature matching  
- 📊 **Interactive Sliders & Selectors** to capture user preferences  
- 🔄 **Real-time Results** using cosine similarity from encoded datasets   
- 🗂️ **Sidebar Search** for looking up specific models and specs  

---

## 📁 Folder Structure

```
📦 phonepro/
├── app.py                   # Main Streamlit app
├── requirements.txt         # Python dependencies
├── label_encoders.pkl       # Pre-trained label encoders
├── scaler.pkl               # Pre-trained feature scaler
├── processed_dataset.csv    # Encoded and scaled dataset for similarity
├── CleanedDataset.csv       # Original readable dataset
└── render.yaml              # (Optional) Render deployment config
```

---

## 💻 Run Locally

1. **Clone the Repository**
   ```bash
   git clone https://github.com/Sagar-Pariyar/PhonePro
   cd PhonePro
   ```
3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Run the app**
   ```bash
   streamlit run app.py
   ```


## 🙌 Credits

Built with ❤️ by Sagar pariyar and Team as part of Data mining and Warehousing coursework
