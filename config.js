/*
 * ============================================================
 *  SITE CONFIGURATION — this is the only file you need to edit.
 * ============================================================
 *
 *  Project details (language, last update, links) are loaded LIVE from GitHub.
 *
 *  Use this file to:
 *    - pick which repos appear in the "Projects" section (and in what order)
 *    - give a repo a nicer title / description / tags / demo link
 *    - hide repos you don't want shown
 *
 *  Repo names are matched case-insensitively.
 */
window.SITE_CONFIG = {
  // Your GitHub username (must match GITHUB_USERNAME on Vercel if you set it).
  githubUsername: "JamshidbekYusupov",

  // Profile. Any field left empty ("") falls back to your GitHub profile.
  name: "Jamshidbek Yusupov",
  role: "Data Scientist",
  tagline:
    "I build machine-learning systems end to end — from scraping and cleaning data, through modelling and explainability, to deployed APIs and small language models trained from scratch.",
  location: "Seoul, South Korea",
  affiliation: "Kookmin University",
  email: "jamusan@kookmin.ac.kr", // leave empty ("") to hide
  phone: "+998910012723", // leave empty ("") to hide

  // Your CV (PDF) for the "Download CV" button. Put the file in the /files folder and write its path here.
  // To update it, replace the file (keep the same name) or change this path. Leave empty ("") to hide the button.
  cv: "files/Yusupov_Jamshidbek_CV_Data_Science.pdf",

  // Your photo. Put an image file in the /images folder and write its path here,
  // e.g. "images/me.jpg". Leave empty ("") to use your GitHub profile picture.
  photo: "",

  // Starting colour theme for first-time visitors: "dark", "white" or "indigo".
  // Visitors can switch themes with the buttons in the header (their choice is remembered).
  defaultTheme: "dark",
  links: {
    github: "https://github.com/JamshidbekYusupov",
    linkedin: "https://www.linkedin.com/in/jamshidbek-yusupov/",
    kaggle: "", // e.g. "https://www.kaggle.com/your-name"
  },

  about: [
    "I am a data scientist working across classical machine learning, natural language processing and large language models. Most of my projects follow the same arc: collect real-world data (often by scraping it myself), engineer features carefully, compare models honestly, explain what they learned, and ship the result behind an API or a small web interface.",
    "Recently I have been focused on language models — implementing a GPT-style Transformer, its tokenizer, training loop and sampling from scratch in PyTorch, and pretraining small models on curated corpora such as Cosmopedia and ArXiv.",
  ],

  skills: {
    "Machine Learning": ["scikit-learn", "XGBoost", "Ensembles (bagging, stacking, voting)", "Explainable AI"],
    "Deep Learning & NLP": ["PyTorch", "Transformers", "Tokenizers", "LLM pretraining", "RAG"],
    "Data": ["Python", "pandas", "NumPy", "Web scraping", "Feature engineering", "Visualization"],
    "Deployment": ["FastAPI", "Gradio", "Docker", "Vercel"],
  },

  // Show forked repositories when the projects list is empty?
  showForks: false,

  // Projects shown in the "Projects" section, in display order. Missing/renamed repos are skipped safely.
  // Leave the list EMPTY ( projects: [], ) to show ALL your public repos automatically,
  // newest first, including new ones you create later.
  // Other good candidates: "arixv_papers_llm_model", "film_classification",
  // "air_quality_classifier_2", "earthquake_intensity_classifier", "Solar_Flare_Forecast".
  projects: [
    "Cosmopedia_Small-_LM",
    "Image-Classification-Project",
    "hotel-booking-predictor",
    "car_price_prediction",
    "water_irrigiation",
  ],

  // Repos to hide everywhere. (Your profile README repo is hidden automatically.)
  hidden: ["arrray", "FunctionPrevdate"],

  // Optional per-repo overrides. Every field is optional:
  //   title, description, tags (array), demo (URL),
  //   image — a picture shown on the project card: put a file in /images/projects/
  //           and write e.g. "images/projects/my-project.png" (or use a full https:// URL)
  // Without an override, the site uses the GitHub description, topics and homepage.
  overrides: {
    "Cosmopedia_Small-_LM": {
      title: "Cosmopedia Small LM",
      description:
        "A 10.7M-parameter GPT-style language model built from scratch in PyTorch.",
      tags: ["PyTorch", "Transformers", "LLM", "Tokenizer"],
    },
    arixv_papers_llm_model: {
      title: "ArXiv Papers LLM",
      description:
        "Building a small language model on ~100,000 machine-learning papers (cs.LG) from ArXiv. A work in progress, documented stage by stage.",
      tags: ["LLM", "NLP", "Pretraining"],
    },
    "hotel-booking-predictor": {
      title: "Hotel Booking Cancellation Predictor",
      description:
        "Predicts hotel booking cancellations with XGBoost, served through FastAPI and a Gradio UI in Docker.",
      tags: ["XGBoost", "FastAPI", "Gradio", "Docker"],
    },
    car_price_prediction: {
      title: "Car Price Prediction",
      description:
        "Regression pipeline comparing tree and linear models, with explainable AI and a FastAPI + Docker deployment.",
      tags: ["Regression", "xAI", "FastAPI", "Docker"],
    },
    film_classification: {
      title: "Animation Technique Classification",
      description:
        "Classifies animated films by production technique using bagging, stacking and voting ensembles, explainable AI and rich feature engineering on Wikipedia-scraped data.",
      tags: ["Ensembles", "xAI", "Web scraping"],
    },
    air_quality_classifier_2: {
      title: "Air Quality Classifier",
      description:
        "Predicts AQI categories from data scraped from the U.S. EPA Air Quality System, with a full pipeline of feature engineering, feature selection and model comparison.",
      tags: ["Classification", "scikit-learn", "Web scraping"],
    },
    earthquake_intensity_classifier: {
      title: "Earthquake Intensity Classifier",
      description:
        "Classifies earthquake intensity from data automatically scraped from the Korea Meteorological Administration, comparing several classification algorithms.",
      tags: ["Classification", "Web scraping"],
    },
    Solar_Flare_Forecast: {
      title: "Solar Flare Forecast",
      description:
        "Forecasts solar-flare activity from SpaceWeatherLive data using engineered temporal features (event duration, cyclical hour encoding, seasonality) and tree-based models.",
      tags: ["Time features", "Tree models", "Web scraping"],
    },
    water_irrigiation: {
      title: "Smart Irrigation Water Requirement",
      description:
        "Estimates crop irrigation water needs from environmental conditions to save water and improve yield.",
      tags: ["Regression", "Agriculture"],
    },
    "Fatigue-Level-Classifier": {
      title: "Fatigue Level Classifier",
      description:
        "Predicts a person's fatigue level (low, moderate, high) from lifestyle data such as sleep, stress and caffeine intake.",
      tags: ["Classification"],
    },
    "Image-Classification-Project": {
      title: "Image Classification",
      description:
        "A PyTorch CNN that classifies CIFAR-10 images (deer vs. ship), with a full train, evaluate and predict pipeline.",
      tags: ["PyTorch", "CNN", "Computer vision"],
    },
    "Anomaly-Detection-Research": {
      description: "Research notebooks exploring anomaly-detection techniques.",
      tags: ["Anomaly detection"],
    },
  },
};
