# Project of Data Visualization (COM-480)


| Student's name | SCIPER |
| -------------- | ------ |
| Néhémie Piero Frei | 346850 |
| Adrian Martinez Lopez| 396379 |
| Clara Irina Hamousz | 326814 | 


[Milestone 1](#milestone-1) • [Milestone 2](#milestone-2) • [Milestone 3](#milestone-3)

## Milestone 1 (20th March, 5pm)

**10% of the final grade**

This is a preliminary milestone to let you set up goals for your final project and assess the feasibility of your ideas.
Please, fill the following sections about your project.

*(max. 2000 characters per section)*


### Dataset


We will use the Letterboxd (Movies Dataset) from Kaggle. This comprehensive resource is actually composed of 10 interconnected datasets (e.g., movies.csv, themes.csv, actors.csv), containing metadata for over 950,000 films.
Data Quality and Preprocessing: Overall, this is a high-quality dataset with a large portion of its data already well-populated. The largest tables, such as those detailing actors and movie countries, are very complete. While there is some missing data in more granular fields—for instance, the specific character role is null for about 25% of the actors—the core attributes remain extremely robust. For the movies themselves, essential columns like duration, description, and release year are available in more than 80% of the cases.
Our preprocessing strategy will consist of straightforward data cleaning: we will drop the incomplete rows to keep only the clean data. Some columns that are not relevant for our work will also be dropped. Because the initial volume is so massive, even after this filtering process, our working dataset will remain extremely large, varied, and highly interesting to look at for our visualizations.




### Problematic
#### Motivations and target audience
Our motivation for this project comes first from  a shared interest in cinema and its history, but also a regular use of the platform Letterboxd. Our goal is to show data from a social media site (where movies and information about them are discovered through the activity of other users) in a completely different way. Our visualization is meant for people with a general interest and curiosity for cinema, but not necessarily any prior knowledge about film history.
To achieve this goal, we plan to present the data from letterboxd through three main lenses : 
#### 1. Geographical : 
We want to bring out the differences and specialities of local cinema across the world (highest rated films, most prolific directors, most popular genres, …) but also allow people to discover movies and directors from smaller countries.
#### 2. Temporal 
We want to highlight information about how cinema evolved over time : movie length, genres distribution, size of cast and crew, …
#### 3. Social 
We want to present the relationships between the people who appear and participate in the production of movies. We will try to highlight people who often collaborate together or artistic movements in cinema where important figures tend to be highly connected.






### Exploratory Data Analysis


# Exploratory Data Analysis


## 1. Dataset Overview


The dataset contains **941,597 movies** from Letterboxd organized in a star schema: a central `movies` table joined by `id` to 9 related tables.


![Dataset Overview](plots/table_overview.png)


![Data Model](plots/00_data_model_diagram.png)


---


This is a really short EDA showing only the core features of the dataset. A more detailed EDA can be found in extended_EDA.md.


## 2. Data Quality & Missing Values


![Missing Values Across All Tables](plots/01b_missing_all_tables.png)


It is interesting to see that 90% of movies do not have an average rating or tagline! We have seen in the data that only more recent movies (from 1990-2000 onwards) have a rating. This might be problematic when trying to provide rating-related visualizations. The remaining gaps (runtime 19%, description 17%, date 10%) are moderate and manageable.


---


## 3. Feature Analysis


### Ratings


![Ratings Stats](plots/table_ratings.png)


The distribution is **left-skewed**: users on Letterboxd tend to rate positively, with the bulk of ratings between 3.0 and 3.5. Very few movies fall below 2.0.


![Rating Distribution](plots/02_rating_distribution.png)


### Release Year


![Release Year Stats](plots/table_year.png)


Movie production volume seems to grow **exponentially** over the decades, with a sharp peak in the 2020s. There is a noticeable dip around 2020 (probably caused by COVID-19).


![Year Distribution](plots/04_year_distribution.png)


---


### Movie Duration


![Duration Stats](plots/table_duration.png)


The length distribution reveals **three distinct groups**:


![Duration Segments](plots/table_duration_segments.png)


The **short film segment is surprisingly large** (37%). The extreme outliers (up to 72,000 min = 50 days) must be filtered.


![Runtime Outlier Analysis](plots/03_runtime_outliers.png)


---


### Genres


![Genres Stats](plots/table_genres.png)


**Drama** dominates with 232K entries, followed by Documentary (164K) and Comedy (141K). Each movie can have multiple genre tags.


![Genre Distribution](plots/06_genre_distribution.png)


---


### Languages


![Languages Stats](plots/table_languages.png)


**English** dominates with 473K entries (45% of all language assignments) as expected whereas the rest do not surpass the 10% mark.


![Top Languages](plots/09_top_languages.png)


---


### Countries


![Countries Stats](plots/table_countries.png)


The **USA** accounts for 174K movies, 3.8x more than France in the second place (46K). The top 5 (USA, France, UK, Japan, Germany) represent the bulk of cataloged films.


![Top Countries](plots/08_top_countries.png)








### Related work




> - What others have already done with the data?
> - Why is your approach original?
> - What source of inspiration do you take? Visualizations that you found on other websites or magazines (might be unrelated to your data).
> - In case you are using a dataset that you have already explored in another context (ML or ADA course, semester project...), you are required to share the report of that work to outline the differences with the submission for this class.


## Milestone 2 (17th April, 5pm)


**10% of the final grade**




## Milestone 3 (29th May, 5pm)


**80% of the final grade**




## Late policy


- < 24h: 80% of the grade for the milestone
- < 48h: 70% of the grade for the milestone





