from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
import pandas as pd
import time

scraping_dir = "./scraping"

# Initialize the WebDriver (Make sure the correct path to your webdriver is set)
s = Service(f"{scraping_dir}/chromedriver.exe")
driver = webdriver.Chrome(service=s)

# Navigate to the URL
url = 'https://www.geeksforgeeks.org/practice-for-cracking-any-coding-interview/'
driver.get(url)
time.sleep(2)  # Wait for the page to load

# Extract all hrefs within li elements
links = []
excluded_links = ["sum-of-array-elements", "reverse-an-array", "save-ironman", "urlify-a-given-string", "find-first-repeated-character", ""]
li_elements = driver.find_elements(By.CSS_SELECTOR, 'li a')

for element in li_elements:
    href = element.get_attribute('href')
    if href and "/problems/" in href:
        links.append(href)



# Create a DataFrame
df = pd.DataFrame({
    'Links': links
})

# Save the DataFrame to an Excel file
df.to_excel(f"{scraping_dir}/links.xlsx", index=False)

# Lists to store the scraped data
question_names = []
question_descriptions = []
question_examples = []

# Function to extract question details
def extract_question_details():
    name = driver.find_element(By.CSS_SELECTOR, '.problems_header_content__title__L2cB2.g-mb-0').text
    content_elements = driver.find_elements(By.CSS_SELECTOR, '.problems_problem_content__Xm_eO > *')
    
    description = []
    examples = []
    temp_example = []

    for element in content_elements:
        if element.tag_name == 'p':
            if temp_example:  # If there's a pending example, save it
                examples.append("\n".join(temp_example))
                temp_example = [] 
            description.append(element.text)
        elif element.tag_name == 'pre':
            temp_example.append(element.text)

    if temp_example:  # Catch any remaining example after the last <pre>
        examples.append("\n".join(temp_example))

    return name, "\n".join(description), examples

# Loop to extract data from each question page
for link in links:
    print(link)
    driver.get(link)
    time.sleep(2)  # Wait for the page to load
    try:
        name, description, examples = extract_question_details()
        question_names.append(name)
        question_descriptions.append(description)
        question_examples.append(examples)
        if len(question_names) == 100:  # stop when we have 100 valid links
            break
    except:
        pass    
          
    
# Create a DataFrame with the scraped data
df = pd.DataFrame({
    'Question Name': question_names,
    'Question Description': question_descriptions,
    'Question Examples': question_examples
})

# Save the DataFrame to an Excel file
df.to_excel(f"{scraping_dir}/questions.xlsx", index=False)

# Close the WebDriver
driver.quit()
