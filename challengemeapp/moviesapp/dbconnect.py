import sqlite3
from sqlite3 import Error
from django.conf import settings
import os
import math
import sympy
import copy
import itertools
from datetime import datetime
import statistics as stat

class DBConnection:

    def __init__(self):
        database = os.path.join(settings.BASE_DIR, 'db.sqlite3')
        DBConnection.create_connection(self, database)

    def create_connection(self, db_file):
        self.conn = None
        try:
            self.conn = sqlite3.connect(db_file)
        except Error as e:
            print(e)

    def get_genres(self):
        cur = self.conn.cursor()
        cur.execute("SELECT * FROM genres_list")
        rows = cur.fetchall()
        return rows

    def getMoviesInfo(self, config):
        genres = config["genre_list"]
        genres_list = []
        per_year_movies_info_list = []
        if "," in genres:
            genres_list = genres.split(",")
        else:
            genres_list.append(genres)
        movie_info_query = "SELECT StartYear,TitleType,m.Tconst,averageRating,numVotes,IsAdult,Directors,Writers FROM movies_data m,title_ratings t WHERE t.tconst=m.Tconst AND StartYear IS NOT NULL AND StartYear <> '' "
        year_range_query = "SELECT MIN(StartYear), MAX(StartYear) FROM movies_data m WHERE StartYear IS NOT NULL AND StartYear <> '' "
        for genre in genres_list:
            genre_str = "AND Genres LIKE '%" + genre + "%' "
            movie_info_query += genre_str
            year_range_query += genre_str

        #  check for adult content
        if config["include_adult_content"] == "false":
            movie_info_query += "AND IsAdult=0 "

        #  check for tv content
        if config["include_tv_shows"] == "false":
            movie_info_query += "AND TitleType <> 'tvEpisode' AND TitleType <> 'tvMovie' AND TitleType <> 'tvSpecial' AND TitleType <> 'tvMiniSeries' AND TitleType <> 'tvSeries' AND TitleType <> 'tvShort' "

        # check for ratings range
        movie_info_query += "AND CAST(averageRating as float)>='"+str(
            config["start_rating"])+"' AND CAST(averageRating as float)<='"+str(config["end_rating"])+"' "

        # check for year range
        movie_info_query += "AND CAST(StartYear as float)>='"+str(
            config["start_year"])+"' AND CAST(StartYear as float)<='"+str(config["end_year"])+"' "

        # order the years in ascending order
        movie_info_query += "ORDER BY StartYear ASC"
        cur = self.conn.cursor()
        cur.execute(year_range_query)
        year_range = cur.fetchone()
        for i in range(int(year_range[0]), int(year_range[1])+1):
            per_year_movies_info = {}
            per_year_movies_info["year"] = i
            per_year_movies_info["movies_released_count"] = 0
            per_year_movies_info["movies_info"] = []
            per_year_movies_info_list.append(per_year_movies_info)

        cur.execute(movie_info_query)
        movies_info = cur.fetchall()
        for movie in movies_info:
            # foreach record from DB
            for movie_year in per_year_movies_info_list:
                # foreach native year
                if int(movie[0]) == movie_year["year"]:
                    movie_year["movies_released_count"] += 1
                    directors_list = []
                    if len(movie[6].split(',')) > 1:
                        directors_list = movie[6].split(',')
                    else:
                        directors_list.append(movie[6])
                    writers_list = []
                    if len(movie[7].split(',')) > 1:
                        writers_list = movie[7].split(',')
                    else:
                        writers_list.append(movie[7])
                    movie_prop = {
                        "Tconst": movie[2],
                        "TitleType": movie[1],
                        "averageRating": float(movie[3]),
                        "numVotes": int(movie[4]),
                        "IsAdult": movie[5],
                        "Directors": directors_list,
                        "Writers": writers_list
                    }
                    movie_year["movies_info"].append(movie_prop)

        return per_year_movies_info_list

    def data_normalization(self, data_list, value):
        if value == 0.0:
            return 0
        else:
            denom = (max(data_list) - min(data_list))
            if denom == 0:
                return 0.0001
            z = (value - min(data_list))/denom
            if z == 0.0:
                z = 0.001
            return z
    
    def color_weight(self, nodes):
        weight_value = 0
        link_weights = [{"type": node["type"], "weight": node["weight"]} for node in nodes]
        abs_weight = abs(link_weights[0]["weight"] - link_weights[1]["weight"])
        weights = []
        for link in link_weights:
            if link["type"] == "in":
                weights.append(link["weight"])
            elif link["type"] == "out":
                weights.append(link["weight"])
        abs_weight /= 2
        
        if(weights[0] > weights[1]):
            weight_value = abs(abs_weight - 0.5)
        elif (weights[0] < weights[1]):
            weight_value = abs(abs_weight + 0.5)
        elif (weights[0] == weights[1]):
            weight_value = 0.5

        return weight_value

    def getDirectorsInfo(self, per_year_movies_info_list, config):
        total_movies = 0
        total_average_rating = 0
        total_votes = 0
        for year in per_year_movies_info_list:
            total_movies+=year["movies_released_count"]
            for movie in year["movies_info"]:
                total_votes+=movie["numVotes"]
                total_average_rating+=movie["averageRating"]
        average_genre_rating = total_average_rating/total_movies
        average_votes = total_votes/total_movies
        director_nodes = []
        director_ego_node = {
            "bloom_order": 0,
            "node_type": "director",
            "id": 0,
            "name":config["genre_list"],
            "size":0.3,
            "un_normalized_size":-0.1,
            "weight":0,
            "num_movies":total_movies,
            "avg_ratings":[round(average_genre_rating, 5)],
            "votes_per_movie":[round(average_votes, 5)]
        }
        writer_nodes = []
        writer_ego_node = {
            "bloom_order": 0,
            "node_type": "writer",
            "id": 0,
            "name":config["genre_list"],
            "size":0.3,
            "un_normalized_size":0.1,
            "weight":0,
            "num_movies":total_movies,
            "avg_ratings":[round(average_genre_rating, 5)],
            "votes_per_movie":[round(average_votes, 5)]
        }
        director_bars, director_links, director_nodes_list = [], [], []
        writer_bars, writer_links, writer_nodes_list = [], [], []
        director_bloom_order = 1
        writer_bloom_order = 1

        temp_num_movies, temp_avg_rating, temp_votes_per_movie, temp_total_votes = sympy.symbols('num_movies avg_rating votes_per_movie total_votes')

        print("line 156", datetime.now())
        for movie_year in per_year_movies_info_list:
            for movie in movie_year["movies_info"]:
                directors_list = movie["Directors"]
                writers_list = movie["Writers"]
                for(director, writer) in itertools.zip_longest(directors_list, writers_list):
                    if(director != None):
                        if director != '\\N':
                            if director not in director_nodes_list:
                                director_movie_avgrating = {}
                                director_movie_avgrating["movie_rating"] = movie["averageRating"]
                                director_movie_avgrating["movie_name"] = movie["Tconst"]
                                node_info = {
                                    "bloom_order": director_bloom_order,
                                    "node_type": "director",
                                    "id": director_bloom_order,
                                    "name": director,
                                    "size":0.1,
                                    "un_normalized_size":0.1,
                                    "weight": 0.1,
                                    "num_movies":1,
                                    "avg_movies":[director_movie_avgrating],
                                    "avg_rating":[round(movie["averageRating"], 5)],
                                    "total_votes":movie["numVotes"],
                                    "votes_per_movie":[round(movie["numVotes"], 5)]
                                }
                                director_nodes.append(node_info)
                                director_bloom_order += 1
                                director_nodes_list.append(director)
                            else:
                                node = next(obj for obj in director_nodes if obj["name"] == director)
                                node["num_movies"] += 1
                                director_rating_dict = {}
                                director_rating_dict["movie_rating"] = movie["averageRating"]
                                director_rating_dict["movie_name"] = movie["Tconst"]
                                node["avg_movies"].append(director_rating_dict)
                                node["avg_rating"].append(movie["averageRating"])
                                node["total_votes"] += movie["numVotes"]
                                node["votes_per_movie"].append(movie["numVotes"])

                    if(writer != None):
                        if writer != '\\N':
                            if writer not in writer_nodes_list:
                                writer_movie_avgrating = {}
                                writer_movie_avgrating["movie_rating"] = movie["averageRating"]
                                writer_movie_avgrating["movie_name"] = movie["Tconst"]
                                node_info = {
                                    "bloom_order": writer_bloom_order,
                                    "node_type": "writer",
                                    "id": writer_bloom_order,
                                    "name": writer,
                                    "size":0.1,
                                    "un_normalized_size":0.1,
                                    "weight": 0.1,
                                    "num_movies":1,
                                    "avg_movies":[writer_movie_avgrating],
                                    "avg_rating":[round(movie["averageRating"], 5)],
                                    "total_votes":movie["numVotes"],
                                    "votes_per_movie":[round(movie["numVotes"], 5)]
                                }
                                writer_nodes.append(node_info)
                                writer_bloom_order += 1
                                writer_nodes_list.append(writer)
                            else:
                                node = next(obj for obj in writer_nodes if obj["name"] == writer)
                                node["num_movies"] += 1
                                writer_rating_dict = {}
                                writer_rating_dict["movie_rating"] = movie["averageRating"]
                                writer_rating_dict["movie_name"] = movie["Tconst"]
                                node["avg_movies"].append(writer_rating_dict)
                                node["avg_rating"].append(int(movie["averageRating"]))
                                node["total_votes"] += movie["numVotes"]
                                node["votes_per_movie"].append(int(movie["numVotes"]))  
        
        director_nodes_list, writer_nodes_list = [], []
        director_writer_names, movie_names = [], []
        for (director_node, writer_node) in itertools.zip_longest(director_nodes, writer_nodes):
            if director_node != None:
                director_node_avg_movies = sorted(director_node["avg_movies"], key=lambda movie_node: movie_node["movie_rating"], reverse=True)
                director_node["avg_movies"] = director_node_avg_movies[:5]
                director_node["avg_rating"] = round(stat.mean(director_node["avg_rating"]), 5)
                director_node["votes_per_movie"] = round(stat.mean(director_node["votes_per_movie"]), 5)
                director_node["un_normalized_size"] = round(sympy.sympify(config["total_influence"]).evalf(subs={temp_num_movies:director_node["num_movies"], temp_avg_rating:director_node["avg_rating"], temp_total_votes:director_node["total_votes"], temp_votes_per_movie:director_node["votes_per_movie"]}), 5)
                
            if writer_node != None:
                writer_node_avg_movies = sorted(writer_node["avg_movies"], key=lambda movie_node: movie_node["movie_rating"], reverse=True)
                writer_node["avg_movies"] = writer_node_avg_movies[:5]
                writer_node["avg_rating"] = round(stat.mean(writer_node["avg_rating"]), 5)
                writer_node["votes_per_movies"] = round(stat.mean(writer_node["votes_per_movie"]), 5)
                writer_node["un_normalized_size"] = round(sympy.sympify(config["total_influence"]).evalf(subs={temp_num_movies:writer_node["num_movies"], temp_avg_rating:writer_node["avg_rating"], temp_total_votes:writer_node["total_votes"], temp_votes_per_movie:writer_node["votes_per_movie"]}), 5)
                
        print("line 325", datetime.now())

        cur = self.conn.cursor()

        director_nodes = sorted(director_nodes, key=lambda director_node: director_node["un_normalized_size"], reverse=True)
        writer_nodes = sorted(writer_nodes, key=lambda writer_node: writer_node["un_normalized_size"], reverse=True)

        if(len(director_nodes) > int(config["num_petals"])):
            del director_nodes[int(config["num_petals"]) + 20:]
        if(len(writer_nodes) > int(config["num_petals"])):
            del writer_nodes[int(config["num_petals"]) + 20:]

        director_names = [director_node["name"] for director_node in director_nodes]
        writer_names = [writer_node["name"] for writer_node in writer_nodes]
        director_writer_names = director_names + writer_names
        director_writer_names = set(director_writer_names)

        name_query = "select nconst, primaryName from name_basics where nconst in ('"
        for name in director_writer_names:
            name_query += name +"', '"
        name_query = name_query[:-3] + ")"
        cur.execute(name_query)
        name_info = cur.fetchall()
        name_info_nconst = [name[0] for name in name_info]

        director_nodes_list = [director_node["un_normalized_size"] for director_node in director_nodes]
        writer_nodes_list = [writer_node["un_normalized_size"] for writer_node in writer_nodes]

        director_node_index, writer_node_index = 1, 1
        for (director_node, writer_node) in itertools.zip_longest(director_nodes, writer_nodes):
            if director_node != None:
                director_node["bloom_order"] = director_node_index
                director_node["id"] = director_node_index
                name_index = name_info_nconst.index(director_node["name"])
                director_node["name"] = name_info[name_index][1].replace('\'','"')
                for movierating in director_node["avg_movies"]:
                    movie_names.append(movierating["movie_name"])
                if director_node_index <= int(config["num_petals"]):
                    director_node["size"] = round(self.data_normalization(director_nodes_list[:int(config["num_petals"])], director_node["un_normalized_size"]), 5) + 0.15
                in_bar = {
                    "bloom_order": director_node_index,
                    "node_type": "director",
                    "id": director_node_index,
                    "name": director_node["name"],
                    "type": "in",
                    "weight": round(sympy.sympify(config["in_weight_expression"]).evalf(subs={temp_num_movies:director_node["num_movies"], temp_avg_rating:director_node["avg_rating"], temp_total_votes:director_node["total_votes"], temp_votes_per_movie:director_node["votes_per_movie"]}), 5)
                }
                out_bar = {
                    "bloom_order": director_node_index,
                    "node_type": "director",
                    "id": director_node_index,
                    "name": director_node["name"],
                    "type": "out",
                    "weight": round(sympy.sympify(config["out_weight_expression"]).evalf(subs={temp_num_movies:director_node["num_movies"], temp_avg_rating:director_node["avg_rating"], temp_total_votes:director_node["total_votes"], temp_votes_per_movie:director_node["votes_per_movie"]}), 5)
                }
                director_bars.append(in_bar)
                director_bars.append(out_bar)
                in_link = {
                    "bloom_order": director_node_index,
                    "node_type": "director",
                    "id": director_node_index,
                    "name": director_node["name"],
                    "type": "in",
                    "source": 0,
                    "target": director_node_index,
                    "weight": 0.1,
                    "padding": 0.00001
                }
                out_link = {
                    "bloom_order": director_node_index,
                    "node_type": "director",
                    "id": director_node_index,
                    "name": director_node["name"],
                    "type": "out",
                    "source": director_node_index,
                    "target": 0,
                    "weight": 0.1,
                    "padding": 0.00001
                }
                director_links.append(in_link)
                director_links.append(out_link)
                director_node_index += 1
            if writer_node != None:
                writer_node["bloom_order"] = writer_node_index
                writer_node["id"] = writer_node_index
                name_index = name_info_nconst.index(writer_node["name"])
                writer_node["name"] = name_info[name_index][1].replace('\'','"')
                for movierating in writer_node["avg_movies"]:
                    movie_names.append(movierating["movie_name"])
                if writer_node_index <= int(config["num_petals"]):
                    writer_node["size"] = round(self.data_normalization(writer_nodes_list[:int(config["num_petals"])], writer_node["un_normalized_size"]), 5) + 0.15
                in_bar = {
                    "bloom_order": writer_node_index,
                    "node_type": "writer",
                    "id": writer_node_index,
                    "name": writer_node["name"],
                    "type": "in",
                    "weight": round(sympy.sympify(config["in_weight_expression"]).evalf(subs={temp_num_movies:writer_node["num_movies"], temp_avg_rating:writer_node["avg_rating"], temp_total_votes:writer_node["total_votes"], temp_votes_per_movie:writer_node["votes_per_movie"]}), 5)
                }
                out_bar = {
                    "bloom_order": writer_node_index,
                    "node_type": "writer",
                    "id": writer_node_index,
                    "name": writer_node["name"],
                    "type": "out",
                    "weight": round(sympy.sympify(config["out_weight_expression"]).evalf(subs={temp_num_movies:writer_node["num_movies"], temp_avg_rating:writer_node["avg_rating"], temp_total_votes:writer_node["total_votes"], temp_votes_per_movie:writer_node["votes_per_movie"]}), 5)
                }
                writer_bars.append(in_bar)
                writer_bars.append(out_bar)
                in_link = {
                    "bloom_order": writer_node_index,
                    "node_type": "writer",
                    "id": writer_node_index,
                    "name": writer_node["name"],
                    "type": "in",
                    "source": 0,
                    "target": writer_node_index,
                    "weight": 0.1,
                    "padding": 0.00001
                }
                out_link = {
                    "bloom_order": writer_node_index,
                    "node_type": "writer",
                    "id": writer_node_index,
                    "name": writer_node["name"],
                    "type": "out",
                    "source": writer_node_index,
                    "target": 0,
                    "weight": 0.1,
                    "padding": 0.00001
                }
                writer_links.append(in_link)
                writer_links.append(out_link)
                writer_node_index += 1       
        
        director_nodes.insert(0, director_ego_node)
        writer_nodes.insert(0, writer_ego_node)

        director_in_list, director_out_list, writer_in_list, writer_out_list = [], [], [], []
        for (director_link, writer_link) in itertools.zip_longest(director_links, writer_links):
            if director_link != None:
                if director_link["bloom_order"] <= int(config["num_petals"]):
                    node = next(obj for obj in director_nodes if obj["name"] == director_link["name"])
                    if director_link["type"] == "in":
                        director_in_list.append(round(sympy.sympify(config["in_weight_expression"]).evalf(subs={temp_num_movies:node["num_movies"], temp_avg_rating:node["avg_rating"], temp_total_votes:node["total_votes"], temp_votes_per_movie:node["votes_per_movie"]}), 5))
                    elif director_link["type"] == "out":
                        director_out_list.append(round(sympy.sympify(config["out_weight_expression"]).evalf(subs={temp_num_movies:node["num_movies"], temp_avg_rating:node["avg_rating"], temp_total_votes:node["total_votes"], temp_votes_per_movie:node["votes_per_movie"]}), 5))
            
            if writer_link != None:
                if writer_link["bloom_order"] <= int(config["num_petals"]):
                    node = next(obj for obj in writer_nodes if obj["name"] == writer_link["name"])
                    if writer_link["type"] == "in":
                        writer_in_list.append(round(sympy.sympify(config["in_weight_expression"]).evalf(subs={temp_num_movies:node["num_movies"], temp_avg_rating:node["avg_rating"], temp_total_votes:node["total_votes"], temp_votes_per_movie:node["votes_per_movie"]}), 5))
                    elif writer_link["type"] == "out":
                        writer_out_list.append(round(sympy.sympify(config["out_weight_expression"]).evalf(subs={temp_num_movies:node["num_movies"], temp_avg_rating:node["avg_rating"], temp_total_votes:node["total_votes"], temp_votes_per_movie:node["votes_per_movie"]}), 5))

        for (director_link, writer_link) in itertools.zip_longest(director_links, writer_links):
            if director_link != None:
                if director_link["bloom_order"] <= int(config["num_petals"]):
                    node = next(obj for obj in director_nodes if obj["name"] == director_link["name"])
                    if director_link["type"] == "in":
                        value = round(sympy.sympify(config["in_weight_expression"]).evalf(subs={temp_num_movies:node["num_movies"], temp_avg_rating:node["avg_rating"], temp_total_votes:node["total_votes"], temp_votes_per_movie:node["votes_per_movie"]}), 5)
                        director_link["weight"] = round(self.data_normalization(director_in_list[:int(config["num_petals"])], value), 5)
                    elif director_link["type"] == "out":
                        value = round(sympy.sympify(config["out_weight_expression"]).evalf(subs={temp_num_movies:node["num_movies"], temp_avg_rating:node["avg_rating"], temp_total_votes:node["total_votes"], temp_votes_per_movie:node["votes_per_movie"]}), 5)
                        director_link["weight"] = round(self.data_normalization(director_out_list[:int(config["num_petals"])], value), 5)
            
            if writer_link != None:
                if writer_link["bloom_order"] <= int(config["num_petals"]):
                    node = next(obj for obj in writer_nodes if obj["name"] == writer_link["name"])
                    if writer_link["type"] == "in":
                        value = round(sympy.sympify(config["in_weight_expression"]).evalf(subs={temp_num_movies:node["num_movies"], temp_avg_rating:node["avg_rating"], temp_total_votes:node["total_votes"], temp_votes_per_movie:node["votes_per_movie"]}), 5)
                        writer_link["weight"] = round(self.data_normalization(writer_in_list[:int(config["num_petals"])], value), 5)
                    elif writer_link["type"] == "out":
                        value = round(sympy.sympify(config["out_weight_expression"]).evalf(subs={temp_num_movies:node["num_movies"], temp_avg_rating:node["avg_rating"], temp_total_votes:node["total_votes"], temp_votes_per_movie:node["votes_per_movie"]}), 5)
                        writer_link["weight"] = round(self.data_normalization(writer_out_list[:int(config["num_petals"])], value), 5)

        movie_names = set(movie_names)
        movie_query = "select tconst, PrimaryTitle from movies_data where tconst in ('"
        for movie in movie_names:
            movie_query += movie +"', '"
        movie_query = movie_query[:-3] + ")"
        cur.execute(movie_query)
        movie_info = cur.fetchall()
        movie_info_tconst = [movie[0] for movie in movie_info]

        for (director_node, writer_node) in itertools.zip_longest(director_nodes, writer_nodes):
            if director_node != None:
                if (director_node["bloom_order"] <= int(config["num_petals"])) and director_node["bloom_order"] != 0:
                    link_nodes = list(filter(lambda link_node: link_node["bloom_order"] == director_node["bloom_order"], director_links))
                    director_node["weight"] = self.color_weight(link_nodes)
                    for movierating in director_node["avg_movies"]:
                        movie_index = movie_info_tconst.index(movierating["movie_name"])
                        movierating["movie_name"] = movie_info[movie_index][1].replace('\'','"')
            if writer_node != None:
                if (writer_node["bloom_order"] <= int(config["num_petals"])) and writer_node["bloom_order"] != 0:
                    link_nodes = list(filter(lambda link_node: link_node["bloom_order"] == writer_node["bloom_order"], writer_links))
                    writer_node["weight"] = self.color_weight(link_nodes)
                    for movierating in writer_node["avg_movies"]:
                        movie_index = movie_info_tconst.index(movierating["movie_name"])
                        movierating["movie_name"] = movie_info[movie_index][1].replace('\'','"')

        data = {
            "directors": {
                "nodes": director_nodes,
                "links": director_links,
                "bars": director_bars,
                "total": director_bloom_order - 1
            },
            "writers": {
                "nodes": writer_nodes,
                "links": writer_links,
                "bars": writer_bars,
                "total": writer_bloom_order - 1
            }
        }

        print("line 462", datetime.now())

        return data

