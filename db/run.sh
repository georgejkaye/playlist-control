DATA_DIR=$1

# Set up db credentials in ~/.pgpass file
DB_HOST=$2
DB_PORT=$3
DB_USER=$4
DB_NAME=$5

for file in $DATA_DIR/*sql; do
    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f $file
done