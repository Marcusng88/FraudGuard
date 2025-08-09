import joblib
import pandas as pd
import os

current_dir = os.path.dirname(os.path.abspath(__file__))
model_path = os.path.join(current_dir, "ml_model", "nft_price_model.pkl")

model = joblib.load(model_path)

all_categories = [
    'Art', 'Photography', 'Music', 'Gaming', 'Sports', 'Collectibles',
    '3D Art', 'Digital Art', 'Pixel Art', 'Abstract', 'Nature', 'Portrait'
]

def predict_price(title, description, category):
    df = pd.DataFrame([{
        "Title": title,
        "Description": description,
        "Category": category
    }])
    return round(model.predict(df)[0], 2)

def main():
    print("Available Categories:")
    print(", ".join(all_categories))
    
    title = input("Enter NFT title: ")
    description = input("Enter NFT description: ")
    category = input("Enter NFT category: ")
    
    if category not in all_categories:
        print("Invalid category. Please choose from the list above.")
        return
    
    predicted_price = predict_price(title, description, category)
    print(f"Predicted Price: {predicted_price} SUI")

if __name__ == "__main__":
    main()
