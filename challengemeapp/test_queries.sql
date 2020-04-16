-- SQLite Queries for Testing

SELECT SUM(numVotes) FROM `title_ratings`;

SELECT * FROM title_ratings ORDER BY averageRating DESC;

SELECT COUNT(*) FROM movies_data;

SELECT DISTINCT(TitleType) FROM movies_data;

SELECT DISTINCT(IsAdult) FROM movies_data;

SELECT Directors,Genres, PrimaryTitle, averageRating FROM movies_data m, title_ratings t WHERE t.tconst=m.Tconst AND IsAdult=1 ORDER BY averageRating DESC;

SELECT * FROM movies_data WHERE Directors LIKE '%\N%';

SELECT StartYear,TitleType,m.Tconst,averageRating,numVotes FROM movies_data m,title_ratings t WHERE t.tconst=m.Tconst AND StartYear IS NOT NULL AND StartYear <> '' AND Genres LIKE '%Adventure%' AND Genres LIKE '%Comedy%' AND CAST(averageRating as float)>=1 AND CAST(averageRating as float)<=10 ORDER BY StartYear ASC;

SELECT * FROM name_basics LIMIT 60;

SELECT MIN(StartYear), MAX(StartYear) FROM movies_data m WHERE StartYear IS NOT NULL AND StartYear <> '';

SELECT nconst,primaryName FROM name_basics WHERE nconst='nm1114166';

CREATE INDEX PersonIDIndex ON name_basics(nconst);

CREATE INDEX PersonNameIndex ON name_basics(primaryName);

PRAGMA index_list(name_basics);

SELECT primaryName FROM name_basics WHERE primaryName LIKE '%Jun%' LIMIT 1;

SELECT * FROM movies_data m,title_ratings r WHERE m.Tconst=r.tconst AND CAST(r.averageRating as float)>9 ORDER BY averageRating DESC;