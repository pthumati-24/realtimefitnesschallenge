# challengeMeApp
Application for Fitness Challenges

## webclient service
Directory - web/ <br/>
Runtime is python. <br/>
### Project Structure
All the files - html, css and js files are to be kept in static dir. The static and templates directory has been modified in the flask app - main.py to point to web/static/. 
### Compilation and deployment
To compile source, download yarn package manager. <br/> 
Run 'yarn' in the static directory. This will download node_modules consisting of tensorflow and other required modules. <br/>
To compile the source run 'yarn watch' in the static dir. This will create a directory - 'dist' which has the compiled code. Use the files in 'dist' to deploy in google app engine. <br/>
The directory 'deployment' has been created for deployment with app.yaml and other files required for deployment. Copy the compiled code in the 'dist' to deployment/static. <br/>
Run gcloud app deploy in deployment/ dir.
