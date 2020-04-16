from django.shortcuts import render
from .dbconnect import DBConnection
from datetime import datetime
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import math
import json


class Entity:
    display_name = ''
    document_id = -1

    def __init__(self, display_name='', document_id=-1):
        self.display_name = display_name
        self.document_id = document_id


class BarChart:
    review_count = 0
    genre_list = ''

    def _init_(self, genre_list='', review_count=0):
        self.review_count = review_count
        self.genre_list = genre_list


def browse(request):
    db_connection = DBConnection()
    rows = db_connection.get_genres()
    entity_list = []
    for i in range(len(rows)):
        entity = Entity(rows[i][0], i)
        entity_list.append(entity)
    return render(request, "genre_selection_page.html", {"entity_list": entity_list})


@csrf_exempt
def flower(request):
    data = {}
    director_info_list = []
    print("Movies Flower Request Time: ", datetime.now())
    total_request_cur = datetime.now()
    time_cur = datetime.now()
    print("FLOWER REQUEST")
    print(request.GET)
    db_connection = DBConnection()
    if request.method == "GET":
        # URL Sample
        # /moviesflower/?genre_list=Adventure,Romance,Horror
        # get config from self.config
        config = {
            "num_petals": 25,
            "start_year": 1874,
            "end_year": 2025,
            "start_rating": 1,
            "end_rating": 10,
            "include_adult_content": "true",
            "include_tv_shows": "true",
            "option": "Director",
            "total_num_years": 152,
            "dataset_start_year": 1874,
            "dataset_end_year": 2025,
            "dataset_start_rating": 1,
            "dataset_end_rating": 10,
            "total_movies": 52596,
            "total_votes": 936073939,
            "avg_movies_per_year": 346,
            "avg_votes_per_movie": 17797,
            "in_weight_expression": "num_movies",
            "out_weight_expression": "avg_rating",
            "total_influence": "total_votes",
            "variables_available": ""
        }
        config["genre_list"] = str(request.GET.get("genre_list"))
        m_time = datetime.now()
        statpanel_json_list = db_connection.getMoviesInfo(config)
        print("~~~~~~~~~~~")
        print("Time taken for movies info fetch: ", datetime.now()-m_time)
        print("~~~~~~~~~~~")
        dw_time = datetime.now()
        data = db_connection.getDirectorsInfo(statpanel_json_list, config)
        print("````````````")
        print("Time taken for director and writer info fetch: ",
              datetime.now()-dw_time)
        print("````````````")
        data["statpanel_data"] = statpanel_json_list
    else:
        # handle update flower POST request
        config = json.loads(request.body)["config"]
        m_time = datetime.now()
        statpanel_json_list = db_connection.getMoviesInfo(config)
        print("~~~~~~~~~~~")
        print("Time taken for movies info fetch: ", datetime.now()-m_time)
        print("~~~~~~~~~~~")
        dw_time = datetime.now()
        data = db_connection.getDirectorsInfo(statpanel_json_list, config)
        print("````````````")
        print("Time taken for director and writer info fetch: ",
              datetime.now()-dw_time)
        print("````````````")
        data["statpanel_data"] = statpanel_json_list

    # populate stats
    total_movies = 0
    total_votes = 0
    for year in statpanel_json_list:
        total_movies += year["movies_released_count"]
        for movie in year["movies_info"]:
            total_votes += movie["numVotes"]
    config["total_movies"] = total_movies
    config["start_year"] = statpanel_json_list[0]["year"]
    config["end_year"] = statpanel_json_list[-1]["year"]
    config["dataset_start_year"] = statpanel_json_list[0]["year"]
    config["dataset_end_year"] = statpanel_json_list[-1]["year"]
    config["total_num_years"] = config["end_year"]-config["start_year"]+1
    config["avg_movies_per_year"] = round(
        (total_movies/config["total_num_years"]),2)
    config["total_votes"] = total_votes
    config["avg_votes_per_movie"] = round((total_votes/total_movies),2)
    data["config"] = config

    print('--------------------------')
    print("Number of Movies found: ", total_movies)
    print('--------------------------')
    print('--------------------------')
    print("Number of Directors being forwarded: ", len(data["directors"]["nodes"]))
    print('--------------------------')
    print('--------------------------')
    print("Number of Writers being forwarded: ", len(data["writers"]["nodes"]))
    print('--------------------------')
    print('Time taken for the request: ', datetime.now() - time_cur)
    print('--------------------------')

    # print(data)
    if request.method == 'GET':
        return render(request, "flower_movies.html", data)
    if request.method == 'POST':
        return JsonResponse(data)
