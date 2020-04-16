import json
from django.http import JsonResponse
from django.shortcuts import render
from django.views.decorators.csrf import csrf_exempt
from .dbconnect import DBConnection
import operator
import itertools
from collections import OrderedDict
import sympy
# Create your views here.
class Entity:
    display_name = ''
    s_no=''
    document_id = -1
    def __init__(self, display_name='', s_no='', document_id=-1):
        self.display_name = display_name
        self.s_no = s_no
        self.document_id = document_id
class BarChart:
    review_count=0
    neighbourhood=''
    def __init__(self, neighbourhood='', review_count=0):
        self.review_count = review_count
        self.neighbourhood = neighbourhood

def browse(request):
    db_connection = DBConnection()
    rows = db_connection.get_cities()
    entity_list = []
    for i in range(len(rows)):
        entity = Entity(rows[i][2], rows[i][0], i)
        entity_list.append(entity)
    return render(request, "browse_airbnb.html", {"entity_list": entity_list})

def flower(request):
    # db_connection = DBConnection()
    # rows = db_connection.get_neighbourhood_reviews("austin")
    # barchart_list = []
    # for each_row in rows:
    #     bar = BarChart(each_row[0], each_row[1])
    #     barchart_list.append(bar)
    return render(request, "airbnb_flower.html")

@csrf_exempt
def barchart(request):

    responseJson = {}

    barchart_list = [[],[],[]]


    db_connection = DBConnection()
    city_name = request.POST.get('city_name')
    country_name = request.POST.get('country_name')
    num_of_petals = int(json.loads(request.POST.get('num_of_petals')))
    petal_order = json.loads(request.POST.get('petal_order'))

    reviews_per_year = db_connection.get_reviews_per_year(city_name)
    listings_per_year, listing_reviews_info, rows_reviews  = db_connection.get_listings_per_year(city_name, country_name)

    # yearly_reviews = []
    for each_row in reviews_per_year:
        yearlyReviewObj = {}
        yearlyReviewObj['year'] = each_row[1]
        yearlyReviewObj['num_of_reviews'] = each_row[0]
        barchart_list[1].append(yearlyReviewObj)

    # yearly_listings = []
    for each_row in listings_per_year:
        yearlyListingsObj = {}
        yearlyListingsObj['year'] = each_row[0]
        yearlyListingsObj['num_of_listings'] = each_row[1]
        yearlyListingsObj['listing_info'] = []
        for val in listing_reviews_info:
            if(val[2] == each_row[0]):
                review_obj = {}
                review_obj['year'] = val[2]
                review_obj['listing_id'] = val[0]
                review_obj['num_of_reviews'] = val[1]
                yearlyListingsObj['listing_info'].append(review_obj)

        barchart_list[2].append(yearlyListingsObj)
    # yearly reviews of listings
    listing_review_data = {'2009': {},'2010': {},'2011': {},'2012': {},'2013': {},'2014': {},'2015': {},'2016': {},'2017': {},'2018': {},'2019': {}}
    for each_row in rows_reviews:
        review_data = listing_review_data[each_row[3]]
        if each_row[2] in review_data.keys():
            #something
            review_data[each_row[2]] += each_row[1]
        else:
            review_data = {'2009': 0,'2010': 0,'2011': 0,'2012': 0,'2013': 0,'2014': 0,'2015': 0,'2016': 0,'2017': 0,'2018': 0,'2019': 0}
            review_data[each_row[2]] = each_row[1]
        listing_review_data[each_row[3]] = review_data

    responseJson = computeChartData(db_connection, city_name, country_name, str(2009), str(2019),str(2009), str(2019), num_of_petals, petal_order, "true")
    responseJson['numReviews'] = barchart_list[1]
    responseJson['numListings'] = barchart_list[2]
    responseJson['listingsReviewsInfo'] = listing_review_data
    # print(responseJson)

    responseJson2 = computeChartData2(db_connection, city_name, country_name, str(2009), str(2019),str(2009), str(2019), num_of_petals, petal_order, "true")
    # responseJson2['numReviews'] = barchart_list[1]
    # responseJson2['numListings'] = barchart_list[2]
    # responseJson2['listingsReviewsInfo'] = listing_review_data

    returnData ={
        0: responseJson,
        1: responseJson2
    }

    return JsonResponse(returnData, safe=False)

@csrf_exempt
def computeChartData(db_connection, city_name, country_name, from_review_year, to_review_year, from_listing_year, to_listing_year, num_of_petals, petal_order, include_bungalows):

    responseData = {};

    barchart = []
    
    review_rows = db_connection.get_neighbourhood_reviews_between_years(city_name, country_name, from_review_year, to_review_year, include_bungalows)
    listing_rows = db_connection.get_neighbourhood_listing_between_years(city_name, country_name, from_listing_year, to_listing_year, include_bungalows)

    id = 0
    neighbourhoodIdMap = {}
    neighbourhoodIdMap[city_name] = id

    review_list = {}
    review_plus_listing = {}
    for each_row in review_rows:
        review_list[each_row[0]] = each_row[1]
        # review_plus_listing[each_row[0]] = each_row[1]
        # Also compute the IDs for neighbourhood 
        id +=1
        neighbourhoodIdMap[each_row[0]] = id

    # Compute review weights
    review_weights = computeWeight(review_rows, "reviews", city_name, country_name)

    temp_num_reviews, temp_num_listings = sympy.symbols('num_reviews num_listings')

    listings_list = {}
    for each_row in listing_rows:
        listings_list[each_row[0]] = each_row[1]
        # review_plus_listing[each_row[0]] += each_row[1]
        review_plus_listing[each_row[0]] = round(sympy.sympify(petal_order).evalf(subs={temp_num_reviews:review_list[each_row[0]], temp_num_listings:listings_list[each_row[0]]}), 5)
    
    sorted_dict = OrderedDict(sorted(review_plus_listing.items(), key=lambda kv:kv[1], reverse=True))
    truncated_dict = dict(itertools.islice(sorted_dict.items(), 2*num_of_petals))
    max_val = truncated_dict[max(truncated_dict.items(), key=operator.itemgetter(1))[0]]
    min_val = truncated_dict[min(truncated_dict.items(), key=operator.itemgetter(1))[0]]
    maxMinDiff = max_val - min_val
    normalized_dict = {}
    for each_item in truncated_dict:
        normalized_dict[each_item] = float(truncated_dict[each_item] - min_val)/maxMinDiff

    # Compute listings weights
    listings_weights = computeWeight(listing_rows, "listings", city_name, country_name)


    for each_row in normalized_dict:
        reviewObj = {}
        reviewObj['id'] = neighbourhoodIdMap[each_row]
        reviewObj['name'] = each_row
        reviewObj['neighbourhood'] = each_row
        reviewObj['bloom_order'] = neighbourhoodIdMap[each_row]
        # Check if that neighbourhood exists for the given range of years
        if each_row in review_list:
            reviewObj['count'] = review_list[each_row]
        else:
            reviewObj['count'] = 0
        reviewObj['node_type'] = "neighbourhood"
        reviewObj['type'] = "in"
        barchart.append(reviewObj)

        listingObj = {}
        listingObj['id'] = neighbourhoodIdMap[each_row]
        listingObj['name'] = each_row
        listingObj['bloom_order'] = neighbourhoodIdMap[each_row]
        listingObj['neighbourhood'] = each_row
        listingObj['count'] = listings_list[each_row] * 25
        listingObj['type'] = "out"
        listingObj['node_type'] = "neighbourhood"
        barchart.append(listingObj)

    return_rows = db_connection.get_neighbourhood_property(city_name, country_name, include_bungalows)
    neighbourhood_property = {}
    for each_row in return_rows:
        if each_row[0] in neighbourhood_property:
            property_type = neighbourhood_property[each_row[0]]
            if each_row[1] in property_type:
                property_type[each_row[1]] += 1
            else:
                property_type[each_row[1]] = 1
            neighbourhood_property[each_row[0]] = property_type
        else:
            property_type = {}
            property_type[each_row[1]] = 1
            neighbourhood_property[each_row[0]] = property_type


    flowerData = prepFlowerData(review_weights, listings_weights, city_name, neighbourhoodIdMap, normalized_dict, neighbourhood_property)

    responseData['bars'] = barchart
    responseData['links'] = flowerData[0]
    responseData['nodes'] = flowerData[1]
        

    return responseData

def computeWeight(lists, listType, city_name, country_name):
    db_connection = DBConnection()

    weights = {}
    if listType == "reviews":
        reviewMaxMin = db_connection.getMaxMin(city_name, country_name, "reviews")
        reviewMax = float(reviewMaxMin[0])
        reviewMin = float(reviewMaxMin[1])
        maxminDiff = reviewMax - reviewMin

        for eachrow in lists:
            weights[eachrow[0]] = (float(eachrow[1]) - reviewMin) / maxminDiff

    else:
        listingsMaxMin = db_connection.getMaxMin(city_name, country_name, "listings")
        listingsMax = listingsMaxMin[0]
        listingsMin = listingsMaxMin[1]
        maxminDiff = listingsMax - listingsMin

        for eachrow in lists:
            weights[eachrow[0]] = (float(eachrow[1]) - listingsMin) / maxminDiff

    return weights

def prepFlowerData(review_weights, listings_weights, city_name, neighbourhoodIdMap, normalized_dict, neighbourhood_property):
    db_connection = DBConnection()

    flowerData = [[],[]]

    flowerReviewNodeObj = {}
    flowerReviewNodeObj['bloom_order'] = 0
    flowerReviewNodeObj['hostels'] = "False"
    flowerReviewNodeObj['filter_num'] = 0
    flowerReviewNodeObj['node_type'] = "neighbourhood"
    flowerReviewNodeObj['id'] = 0
    flowerReviewNodeObj['name'] = json.loads(city_name)
    flowerReviewNodeObj['dif'] = 0 
    flowerReviewNodeObj['inf_in'] = 0 #Need to check
    flowerReviewNodeObj['inf_out'] = 0 #Need to check
    flowerReviewNodeObj['ratio'] = -1 
    flowerReviewNodeObj['size'] = 0.3 #Need to check
    flowerReviewNodeObj['sum'] = 6.5 #Need to check
    flowerReviewNodeObj['weight'] = 0 #Need to check
    # flowerReviewNodeObj['xpos'] = 0 #Need to check
    # flowerReviewNodeObj['ypos'] = 0 #Need to check
    flowerData[1].append(flowerReviewNodeObj)

    # x_pos = float(0.00002)
    # y_pos = float(0.00002)
    id = 1
    for each_row in normalized_dict:
        # Link review obj 
        flowerReviewDataObj = {}
        flowerReviewDataObj['node_type'] = "neighbourhood"
        flowerReviewDataObj['id'] = id #neighbourhoodIdMap[each_row]
        flowerReviewDataObj['bloom_order'] = id #neighbourhoodIdMap[each_row]
        flowerReviewDataObj['filter_num'] = 0
        flowerReviewDataObj['padding'] = 0.01
        flowerReviewDataObj['type'] = "in"
        flowerReviewDataObj['source'] = id #neighbourhoodIdMap[each_row] #neighbourhood
        flowerReviewDataObj['target'] = 0
        if review_weights[each_row] == 0.0:
            flowerReviewDataObj['weight'] = 0.01
        else:
            flowerReviewDataObj['weight'] = review_weights[each_row]
        flowerReviewDataObj['o_weight'] = 0 #Not sure what it needs to have
        flowerData[0].append(flowerReviewDataObj)

        # Link listing obj 
        flowerListingDataObj = {}
        flowerListingDataObj['node_type'] = "neighbourhood"
        flowerListingDataObj['id'] = id #neighbourhoodIdMap[each_row]
        flowerListingDataObj['bloom_order'] = id #neighbourhoodIdMap[each_row]
        flowerListingDataObj['filter_num'] = 0
        flowerListingDataObj['padding'] = 0.01
        flowerListingDataObj['type'] = "out"
        flowerListingDataObj['source'] = 0
        flowerListingDataObj['target'] = id #neighbourhoodIdMap[each_row]
        if listings_weights[each_row] == 0.0:
            flowerListingDataObj['weight'] = 0.01
        else:
            flowerListingDataObj['weight'] = listings_weights[each_row]
        flowerListingDataObj['o_weight'] = 0 #Not sure what it needs to have
        flowerData[0].append(flowerListingDataObj)
        
        # Node Obj 
        flowerReviewNodeObj = {}
        flowerReviewNodeObj['bloom_order'] = id #neighbourhoodIdMap[each_row]
        flowerReviewNodeObj['hostels'] = "False"
        flowerReviewNodeObj['filter_num'] = 0
        flowerReviewNodeObj['node_type'] = "neighbourhood"
        flowerReviewNodeObj['id'] = id #neighbourhoodIdMap[each_row]
        flowerReviewNodeObj['name'] = each_row
        flowerReviewNodeObj['dif'] = float(review_weights[each_row]) - float(listings_weights[each_row]) # check again
        flowerReviewNodeObj['inf_in'] = review_weights[each_row] 
        flowerReviewNodeObj['inf_out'] = listings_weights[each_row]
        flowerReviewNodeObj['ratio'] = -1 
        if normalized_dict[each_row] == 0.0:
            flowerReviewNodeObj['size'] = 0.01
        else:
            flowerReviewNodeObj['size'] = normalized_dict[each_row]
        flowerReviewNodeObj['sum'] = 6.5 #Need to check 
        if review_weights[each_row] > listings_weights[each_row]:
            flowerReviewNodeObj['weight'] = abs(abs(flowerReviewNodeObj['dif']) - 0.5)
        elif review_weights[each_row] < listings_weights[each_row]:
            flowerReviewNodeObj['weight'] = abs(abs(flowerReviewNodeObj['dif']) + 0.5)
        else:
            flowerReviewNodeObj['weight'] = 0.5

        sorted_dict = OrderedDict(sorted(neighbourhood_property[each_row].items(), key=lambda kv:kv[1], reverse=True))
        truncated_dict = dict(itertools.islice(sorted_dict.items(), 5))
        property_type_list =[]
        for prop_typ, val in truncated_dict.items():
            property_type_dict ={}
            property_type_dict['type'] = prop_typ
            property_type_dict['value'] = val
            property_type_list.append(property_type_dict)
        flowerReviewNodeObj['property_type'] = property_type_list
        id += 1
        flowerData[1].append(flowerReviewNodeObj)

    return flowerData


@csrf_exempt
def regenerate(request):
    db_connection = DBConnection()
    return_response = {}
    city_name = request.POST.get('city_name')
    country_name = request.POST.get('country_name')
    from_review_year = int(request.POST.get('from_review_year'))
    to_review_year = int(request.POST.get('to_review_year'))
    from_listing_year = int(request.POST.get('from_listing_year'))
    to_listing_year = int(request.POST.get('to_listing_year'))
    num_of_petals = int(json.loads(request.POST.get('num_of_petals')))
    petal_order = json.loads(request.POST.get('petal_order'))
    include_bungalows = request.POST.get('include_bungalows')
    # print(include_hostels)
    # num_of_petals = 25
    return_response = computeChartData(db_connection, city_name, country_name, from_review_year, to_review_year, from_listing_year, to_listing_year, num_of_petals, petal_order, include_bungalows)
    return_response2 = computeChartData2(db_connection, city_name, country_name, from_review_year, to_review_year, from_listing_year, to_listing_year, num_of_petals, petal_order, include_bungalows)

    returnData ={
        0: return_response,
        1: return_response2
    }
    return JsonResponse(returnData, safe=False)

def computeChartData2(db_connection, city_name, country_name, from_review_year, to_review_year, from_listing_year, to_listing_year, num_of_petals, petal_order, include_bungalows):
    responseData = {}

    barchart = []
    
    review_rows = db_connection.get_zipcode_reviews_between_years(city_name, country_name, from_review_year, to_review_year, include_bungalows)
    listing_rows = db_connection.get_zipcode_listing_between_years(city_name, country_name, from_listing_year, to_listing_year, include_bungalows)

    id = 0
    neighbourhoodIdMap = {}
    neighbourhoodIdMap[city_name] = id

    review_list = {}
    review_plus_listing = {}
    for each_row in review_rows:
        review_list[each_row[0]] = each_row[1]
        # review_plus_listing[each_row[0]] = each_row[1]
        # Also compute the IDs for neighbourhood 
        id +=1
        neighbourhoodIdMap[each_row[0]] = id

    # Compute review weights
    review_weights = computeWeightForZipcode(review_rows, "reviews", city_name, country_name)

    temp_num_reviews, temp_num_listings = sympy.symbols('num_reviews num_listings')

    listings_list = {}
    for each_row in listing_rows:
        listings_list[each_row[0]] = each_row[1]
        review_plus_listing[each_row[0]] = round(sympy.sympify(petal_order).evalf(subs={temp_num_reviews:review_list[each_row[0]], temp_num_listings:listings_list[each_row[0]]}), 5)
        
    sorted_dict = OrderedDict(sorted(review_plus_listing.items(), key=lambda kv:kv[1], reverse=True))
    truncated_dict = dict(itertools.islice(sorted_dict.items(), 2*num_of_petals))
    max_val = truncated_dict[max(truncated_dict.items(), key=operator.itemgetter(1))[0]]
    min_val = truncated_dict[min(truncated_dict.items(), key=operator.itemgetter(1))[0]]
    maxMinDiff = max_val - min_val
    normalized_dict = {}
    for each_item in truncated_dict:
        normalized_dict[each_item] = float(truncated_dict[each_item] - min_val)/maxMinDiff

    # Compute listings weights
    listings_weights = computeWeightForZipcode(listing_rows, "listings", city_name, country_name)


    for each_row in listing_rows:
        reviewObj = {}
        reviewObj['neighbourhood'] = each_row[0]

        # Check if that neighbourhood exists for the given range of years
        if each_row[0] in review_list:
            reviewObj['count'] = review_list[each_row[0]]
        else:
            reviewObj['count'] = 0
        reviewObj['node_type'] = "zipcode"
        reviewObj['type'] = "in"
        barchart.append(reviewObj)

        listingObj = {}
        listingObj['neighbourhood'] = each_row[0] 
        listingObj['count'] = each_row[1] * 25
        listingObj['type'] = "out"
        listingObj['node_type'] = "zipcode"
        barchart.append(listingObj)

    return_rows = db_connection.get_zipcode_property(city_name, country_name, include_bungalows)
    zipcode_property = {}
    for each_row in return_rows:
        if each_row[0] in zipcode_property:
            property_type = zipcode_property[each_row[0]]
            if each_row[1] in property_type:
                property_type[each_row[1]] += 1
            else:
                property_type[each_row[1]] = 1
            zipcode_property[each_row[0]] = property_type
        else:
            property_type = {}
            property_type[each_row[1]] = 1
            zipcode_property[each_row[0]] = property_type

    flowerData = prepFlowerDataForZipCode(review_weights, listings_weights, city_name, neighbourhoodIdMap, normalized_dict, zipcode_property)

    responseData['bars'] = barchart
    responseData['links'] = flowerData[0]
    responseData['nodes'] = flowerData[1]
        

    return responseData

def computeWeightForZipcode(lists, listType, city_name, country_name):
    db_connection = DBConnection()

    weights = {}
    if listType == "reviews":
        reviewMaxMin = db_connection.getMaxMinForZipCode(city_name, country_name, "reviews")
        reviewMax = float(reviewMaxMin[0])
        reviewMin = float(reviewMaxMin[1])
        maxminDiff = reviewMax - reviewMin

        for eachrow in lists:
            weights[eachrow[0]] = (float(eachrow[1]) - reviewMin) / maxminDiff

    else:
        listingsMaxMin = db_connection.getMaxMinForZipCode(city_name, country_name, "listings")
        listingsMax = listingsMaxMin[0]
        listingsMin = listingsMaxMin[1]
        maxminDiff = listingsMax - listingsMin

        for eachrow in lists:
            weights[eachrow[0]] = (float(eachrow[1]) - listingsMin) / maxminDiff

    return weights

def prepFlowerDataForZipCode(review_weights, listings_weights, city_name, neighbourhoodIdMap, normalized_dict, zipcode_property):

    flowerData = [[],[]]

    flowerReviewNodeObj = {}
    flowerReviewNodeObj['bloom_order'] = 0
    flowerReviewNodeObj['hostels'] = "False"
    flowerReviewNodeObj['filter_num'] = 0
    flowerReviewNodeObj['node_type'] = "zipcode"
    flowerReviewNodeObj['id'] = 0
    flowerReviewNodeObj['name'] = json.loads(city_name)
    flowerReviewNodeObj['dif'] = 0 
    flowerReviewNodeObj['inf_in'] = 0 #Need to check
    flowerReviewNodeObj['inf_out'] = 0 #Need to check
    flowerReviewNodeObj['ratio'] = -1 
    flowerReviewNodeObj['size'] = 0.3 #Need to check
    flowerReviewNodeObj['sum'] = 6.5 #Need to check
    flowerReviewNodeObj['weight'] = 0 #Need to check
    # flowerReviewNodeObj['xpos'] = 0 #Need to check
    # flowerReviewNodeObj['ypos'] = 0 #Need to check
    flowerData[1].append(flowerReviewNodeObj)

    # x_pos = float(0.00002)
    # y_pos = float(0.00002)
    id = 1
    for each_row in normalized_dict:
        # Link review obj 
        flowerReviewDataObj = {}
        flowerReviewDataObj['node_type'] = "zipcode"
        flowerReviewDataObj['id'] = id #neighbourhoodIdMap[each_row]
        flowerReviewDataObj['bloom_order'] = id #neighbourhoodIdMap[each_row]
        flowerReviewDataObj['filter_num'] = 0
        flowerReviewDataObj['padding'] = 0.01
        flowerReviewDataObj['type'] = "in"
        flowerReviewDataObj['source'] = id #neighbourhoodIdMap[each_row] #neighbourhood
        flowerReviewDataObj['target'] = 0
        if review_weights[each_row] == 0.0:
            flowerReviewDataObj['weight'] = 0.01
        else:
            flowerReviewDataObj['weight'] = review_weights[each_row]
        flowerReviewDataObj['o_weight'] = 0 #Not sure what it needs to have
        flowerData[0].append(flowerReviewDataObj)

        # Link listing obj 
        flowerListingDataObj = {}
        flowerListingDataObj['node_type'] = "zipcode"
        flowerListingDataObj['id'] = id #neighbourhoodIdMap[each_row]
        flowerListingDataObj['bloom_order'] = id #neighbourhoodIdMap[each_row]
        flowerListingDataObj['filter_num'] = 0
        flowerListingDataObj['padding'] = 0.01
        flowerListingDataObj['type'] = "out"
        flowerListingDataObj['source'] = 0
        flowerListingDataObj['target'] = id #neighbourhoodIdMap[each_row]
        if listings_weights[each_row] == 0.0:
            flowerListingDataObj['weight'] = 0.01
        else:
            flowerListingDataObj['weight'] = listings_weights[each_row]
        flowerListingDataObj['o_weight'] = 0 #Not sure what it needs to have
        flowerData[0].append(flowerListingDataObj)
        
        # Node Obj 
        flowerReviewNodeObj = {}
        flowerReviewNodeObj['bloom_order'] = id #neighbourhoodIdMap[each_row]
        flowerReviewNodeObj['hostels'] = "False"
        flowerReviewNodeObj['filter_num'] = 0
        flowerReviewNodeObj['node_type'] = "zipcode"
        flowerReviewNodeObj['id'] = id #neighbourhoodIdMap[each_row]
        flowerReviewNodeObj['name'] = each_row
        flowerReviewNodeObj['dif'] = float(review_weights[each_row]) - float(listings_weights[each_row]) # check again
        flowerReviewNodeObj['inf_in'] = review_weights[each_row] 
        flowerReviewNodeObj['inf_out'] = listings_weights[each_row]
        flowerReviewNodeObj['ratio'] = -1 
        if normalized_dict[each_row] == 0.0:
            flowerReviewNodeObj['size'] = 0.01
        else:
            flowerReviewNodeObj['size'] = normalized_dict[each_row] #Need to check -- circle radius
        flowerReviewNodeObj['sum'] = 6.5 #Need to check 
        if flowerReviewNodeObj['dif']<=0:
            flowerReviewNodeObj['weight'] = 0.5 + abs(flowerReviewNodeObj['dif'])
        else:
            flowerReviewNodeObj['weight'] = flowerReviewNodeObj['dif']
            # print(flowerReviewNodeObj['dif'])
        # flowerReviewNodeObj['weight'] = 0 #Need to check --- color
        # flowerReviewNodeObj['xpos'] = 0 #Need to check 0.00002
        # flowerReviewNodeObj['ypos'] = 0 #Need to check 
        sorted_dict = OrderedDict(sorted(zipcode_property[each_row].items(), key=lambda kv:kv[1], reverse=True))
        truncated_dict = dict(itertools.islice(sorted_dict.items(), 5))
        property_type_list =[]
        for prop_typ, val in truncated_dict.items():
            property_type_dict ={}
            property_type_dict['type'] = prop_typ
            property_type_dict['value'] = val
            property_type_list.append(property_type_dict)
        flowerReviewNodeObj['property_type'] = property_type_list
        flowerData[1].append(flowerReviewNodeObj)
        id += 1

    return flowerData