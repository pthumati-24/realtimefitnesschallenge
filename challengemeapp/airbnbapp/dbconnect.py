import sqlite3
from sqlite3 import Error
from django.conf import settings
import os
import json


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

    def get_cities(self):
        cur = self.conn.cursor()
        cur.execute("SELECT * FROM airbnb_ego_selection")
        rows = cur.fetchall()
        return rows

    # def get_neighbourhood_reviews(self, cityname, countryname):
    #     cur = self.conn.cursor()
    #     query_string = "select neighbourhood,  sum(number_of_reviews) as reviews_count from " +  countryname + " where City = "+cityname+ " group by neighbourhood order by reviews_count desc;"
    #     cur.execute(query_string)
    #     rows = cur.fetchall()
    #     return rows

    # def get_neighbourhood_listing(self, cityname, countryname):
    #     cur = self.conn.cursor()
    #     query_string = "select neighbourhood, count(*) as listings_count from " + countryname + " where City = " + cityname + " group by neighbourhood order by listings_count desc;"
    #     cur.execute(query_string)
    #     rows = cur.fetchall()
    #     return rows

    def get_neighbourhood_reviews_between_years(self, cityname, countryname, from_year, to_year, include_bungalows):
        cur = self.conn.cursor()
        if include_bungalows == "true":
            query_string = "select neighbourhood,  sum(number_of_reviews) as reviews_count from" + countryname + " where City=" + cityname + " and strftime('%Y', first_review) between '" + str(from_year) + "' and '" + str(to_year) +"' group by neighbourhood order by reviews_count desc;"
        else:
            query_string = "select neighbourhood,  sum(number_of_reviews) as reviews_count from" + countryname + " where City=" + cityname + " and strftime('%Y', first_review) between '" + str(from_year) + "' and '" + str(to_year) +"' and property_type<>'Bungalow' group by neighbourhood order by reviews_count desc;"
        cur.execute(query_string)
        rows = cur.fetchall()
        return rows

    def get_neighbourhood_listing_between_years(self, cityname, countryname, from_year, to_year, include_bungalows):
        cur = self.conn.cursor()
        if include_bungalows == "true":
            query_string = "select neighbourhood, count(*) as listings_count from " + countryname + " where City = " + cityname + " and strftime('%Y',first_review) between '" + str(from_year) + "' and '" + str(to_year) + "' group by neighbourhood order by listings_count desc ;"
        else:
            query_string = "select neighbourhood, count(*) as listings_count from " + countryname + " where City = " + cityname + " and strftime('%Y',first_review) between '" + str(from_year) + "' and '" + str(to_year) + "' and property_type<>'Bungalow' group by neighbourhood order by listings_count desc ;"
        cur.execute(query_string)
        rows = cur.fetchall()
        return rows
        
    def get_reviews_per_year(self, cityname):
        cur = self.conn.cursor()
        tablename = json.loads(cityname)+"_reviews"
        query_string = "select count(*) as number_of_reviews, strftime('%Y',date) as year from " + tablename + " group by year;"
        cur.execute(query_string)
        rows = cur.fetchall()
        return rows

    def get_listings_per_year(self, cityname, country):
        cur = self.conn.cursor()
        query_string = "select strftime('%Y', first_review) as year, count(*) as number_of_listings, id from " + country + " group by year ;"
        cur.execute(query_string)
        rows = cur.fetchall()
        query_string2 = "select listing_id, count(*) as reviews_count, strftime('%Y', date) as year from "+ json.loads(cityname)+"_reviews group by year,listing_id;"
        rows2 = cur.execute(query_string2).fetchall()
        query_string4 = "select listing_id, count(*) as reviews_count, strftime('%Y', date) as review_year, strftime('%Y', first_review) as listing_year from "+json.loads(cityname)+"_reviews, "+country+" where City="+cityname+" and "+country+".id=listing_id group by review_year,listing_id;"
        rows4 = cur.execute(query_string4).fetchall()
        return rows, rows2, rows4

    def getMaxMin(self, cityname, countryname, type):
        cur = self.conn.cursor()
        if type == "reviews":
            max_query_string = "select sum(number_of_reviews) as max from " + countryname + " where City = " + cityname + " group by neighbourhood order by max desc limit 1;"
            min_query_string = "select sum(number_of_reviews) as min from " + countryname + " where City = " + cityname + " group by neighbourhood order by min asc limit 1;"
            cur.execute(max_query_string)
            max_val = cur.fetchone()[0]
            cur.execute(min_query_string)
            min_val = cur.fetchone()[0]
            
        else:
            max_query_string = "select count(*) as max from " + countryname + " where City = " + cityname + " group by neighbourhood order by max desc limit 1;"
            min_query_string = "select count(*) as min from " + countryname + " where City = " + cityname + " group by neighbourhood order by min asc limit 1;"
            cur.execute(max_query_string)
            max_val = cur.fetchone()[0]
            cur.execute(min_query_string)
            min_val = cur.fetchone()[0]
        
        maxmin = [max_val, min_val]
        return maxmin

    def get_zipcode_reviews_between_years(self, cityname, countryname, from_year, to_year, include_bungalows):
        cur = self.conn.cursor()
        if include_bungalows == "true":
            query_string = "select zipcode,  sum(number_of_reviews) as reviews_count from" + countryname + " where City=" + cityname + " and strftime('%Y', first_review) between '" + str(from_year) + "' and '" + str(to_year) +"' and zipcode<>'0' and zipcode<>'' group by zipcode order by reviews_count desc;"
        else:
            query_string = "select zipcode,  sum(number_of_reviews) as reviews_count from" + countryname + " where City=" + cityname + " and strftime('%Y', first_review) between '" + str(from_year) + "' and '" + str(to_year) +"' and zipcode<>'0' and zipcode<>'' and property_type<>'Bungalow' group by zipcode order by reviews_count desc;"
        cur.execute(query_string)
        rows = cur.fetchall()
        return rows

    def get_zipcode_listing_between_years(self, cityname, countryname, from_year, to_year, include_bungalows):
        cur = self.conn.cursor()
        if include_bungalows == "true":
            query_string = "select zipcode, count(*) as listings_count from " + countryname + " where City = " + cityname + " and strftime('%Y',first_review) between '" + str(from_year) + "' and '" + str(to_year) + "' and zipcode<>'0' and zipcode<>'' group by zipcode order by listings_count desc ;"
        else:
            query_string = "select zipcode, count(*) as listings_count from " + countryname + " where City = " + cityname + " and strftime('%Y',first_review) between '" + str(from_year) + "' and '" + str(to_year) + "' and zipcode<>'0' and zipcode<>'' and property_type<>'Bungalow' group by zipcode order by listings_count desc ;"
        cur.execute(query_string)
        rows = cur.fetchall()
        return rows

    def getMaxMinForZipCode(self, cityname, countryname, type):
        cur = self.conn.cursor()
        if type == "reviews":
            max_query_string = "select sum(number_of_reviews) as max from " + countryname + " where City = " + cityname + " group by zipcode order by max desc limit 1;"
            min_query_string = "select sum(number_of_reviews) as min from " + countryname + " where City = " + cityname + " group by zipcode order by min asc limit 1;"
            cur.execute(max_query_string)
            max_val = cur.fetchone()[0]
            cur.execute(min_query_string)
            min_val = cur.fetchone()[0]
            
        else:
            max_query_string = "select count(*) as max from " + countryname + " where City = " + cityname + " group by zipcode order by max desc limit 1;"
            min_query_string = "select count(*) as min from " + countryname + " where City = " + cityname + " group by zipcode order by min asc limit 1;"
            cur.execute(max_query_string)
            max_val = cur.fetchone()[0]
            cur.execute(min_query_string)
            min_val = cur.fetchone()[0]
        
        maxmin = [max_val, min_val]
        return maxmin

    def get_neighbourhood_property(self, cityname, countryname, include_bungalows):
        cur = self.conn.cursor()
        if include_bungalows == "true":
            query_string = "select neighbourhood, property_type from " + countryname +" where City="+cityname+" order by neighbourhood;"
        else:
            query_string = "select neighbourhood, property_type from " + countryname +" where City="+cityname+" and property_type<>'Bungalow' order by neighbourhood;"
        cur.execute(query_string)
        rows = cur.fetchall()
        return rows
    
    def get_zipcode_property(self, cityname, countryname, include_bungalows):
        cur = self.conn.cursor()
        if include_bungalows == "true":
            query_string = "select zipcode, property_type from " + countryname +" where City="+cityname+" order by zipcode;"
        else:
            query_string = "select zipcode, property_type from " + countryname +" where City="+cityname+" and property_type<>'Bungalow' order by zipcode;"
        cur.execute(query_string)
        rows = cur.fetchall()
        return rows