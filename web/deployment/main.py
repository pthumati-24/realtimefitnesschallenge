import datetime
import os
from flask import Flask, render_template, request, jsonify, redirect, url_for
import sqlalchemy
from werkzeug.security import check_password_hash
import json

app = Flask(__name__, static_url_path="/", static_folder="./", template_folder="./")

db_user = "root"
db_pass = "Challengeme1234"
db_name = "userdb"
cloud_sql_connection_name = "ccproject2-274303:us-west2:challengemedb"

# The SQLAlchemy engine will help manage interactions, including automatically
# managing a pool of connections to your database
db = sqlalchemy.create_engine(
    # Equivalent URL:
    # mysql+pymysql://<db_user>:<db_pass>@/<db_name>?unix_socket=/cloudsql/<cloud_sql_instance_name>
    sqlalchemy.engine.url.URL(
        drivername="mysql+pymysql",
        username=db_user,
        password=db_pass,
        database=db_name,
        query={"unix_socket": "/cloudsql/{}".format(cloud_sql_connection_name)},
    ),
    # ... Specify additional properties here.
    # ...
)

@app.route('/')
def root():
    # For the sake of example, use static information to inflate the template.
    # This will be replaced with real information in later steps.
    # dummy_times = [datetime.datetime(2018, 1, 1, 10, 0, 0),
    #                datetime.datetime(2018, 1, 2, 10, 30, 0),
    #                datetime.datetime(2018, 1, 3, 11, 0, 0),
    #                ]

    return render_template('login.html', title="ChallangeMe")

@app.route('/index')
def index():
    return render_template('index.html', title="ChallangeMe")

@app.route("/login", methods=("GET", "POST"))
def login():
    """Log in a registered user by adding the user id to the session."""
    if request.method == "POST":
        # print(json.loads(request.data));
        username = request.form['username']
        password = request.form['password']
        print("user=== "+username)
        print("password=== "+password)
        with db.connect() as conn:

            # conn = get_db()
            error = None
            user = conn.execute(
                "SELECT * FROM users WHERE username = %s and pass = %s", (username,password,)
            ).fetchone()

        if user is None:
            error = "Incorrect username."
        # elif not check_password_hash(user["password"], password):
        #     error = "Incorrect password."

        if error is None:
            # store the user id in a new session and return to the index
            # session.clear()
            # session["user_id"] = user["id"]
            return redirect(url_for("index"))

        # flash(error)

    return render_template("login.html")

if __name__ == '__main__':
    # This is used when running locally only. When deploying to Google App
    # Engine, a webserver process such as Gunicorn will serve the app. This
    # can be configured by adding an `entrypoint` to app.yaml.
    # Flask's development server will automatically serve static files in
    # the "static" directory. See:
    # http://flask.pocoo.org/docs/1.0/quickstart/#static-files. Once deployed,
    # App Engine itself will serve those files as configured in app.yaml.
    app.run(host='127.0.0.1', port=7000, debug=True)
