#!/bin/bash

# List of genre seeds
genre_seeds=(
    "acoustic"
    "afrobeat"
    "alt-rock"
    "alternative"
    "ambient"
    "anime"
    "black-metal"
    "bluegrass"
    "blues"
    "bossanova"
    "brazil"
    "breakbeat"
    "british"
    "cantopop"
    "chicago-house"
    "children"
    "chill"
    "classical"
    "club"
    "comedy"
    "country"
    "dance"
    "dancehall"
    "death-metal"
    "deep-house"
    "detroit-techno"
    "disco"
    "disney"
    "drum-and-bass"
    "dub"
    "dubstep"
    "edm"
    "electro"
    "electronic"
    "emo"
    "folk"
    "forro"
    "french"
    "funk"
    "garage"
    "german"
    "gospel"
    "goth"
    "grindcore"
    "groove"
    "grunge"
    "guitar"
    "happy"
    "hard-rock"
    "hardcore"
    "hardstyle"
    "heavy-metal"
    "hip-hop"
    "holidays"
    "honky-tonk"
    "house"
    "idm"
    "indian"
    "indie"
    "indie-pop"
    "industrial"
    "iranian"
    "j-dance"
    "j-idol"
    "j-pop"
    "j-rock"
    "jazz"
    "k-pop"
    "kids"
    "latin"
    "latino"
    "malay"
    "mandopop"
    "metal"
    "metal-misc"
    "metalcore"
    "minimal-techno"
    "movies"
    "mpb"
    "new-age"
    "new-release"
    "opera"
    "pagode"
    "party"
    "philippines-opm"
    "piano"
    "pop"
    "pop-film"
    "post-dubstep"
    "power-pop"
    "progressive-house"
    "psych-rock"
    "punk"
    "punk-rock"
    "r-n-b"
    "rainy-day"
    "reggae"
    "reggaeton"
    "road-trip"
    "rock"
    "rock-n-roll"
    "rockabilly"
    "romance"
    "sad"
    "salsa"
    "samba"
    "sertanejo"
    "show-tunes"
    "singer-songwriter"
    "ska"
    "sleep"
    "songwriter"
    "soul"
    "soundtracks"
    "spanish"
    "study"
    "summer"
    "swedish"
    "synth-pop"
    "tango"
    "techno"
    "trance"
    "trip-hop"
    "turkish"
    "work-out"
    "world-music"
)
limit=100

# Get the number of available processors (CPU cores)
max_processes=$(nproc)
echo "Maximum number of processes: $max_processes"

# Function to process a genre
process_genre() {
    local genre="$1"

    success=false

    # Retry the process for the genre until successful
    while [ $success = false ]; do
        # Execute the Python program for the genre
        python main.py get_data --genre "$genre" --limit 100

        # Check the exit code of the Python program
        if [ $? -eq 0 ]; then
            success=true
            echo "Finished processing $genre."
        else
            echo "Error occurred while processing $genre. Retrying..."
        fi
    done
}

# Loop through each genre seed and process them with limited parallelism
for genre in "${genre_seeds[@]}"; do
    echo "Processing $genre..."

    # Check if any CSV files already exist
    csv_files=("./data/*_${genre}.csv")
    if [ $(ls -1 ${csv_files[@]} 2>/dev/null | wc -l) -gt 0 ]; then
        echo "Files for $genre already exist. Skipping..."
        continue
    fi

    # Limit the number of concurrent processes
    current_processes=$(jobs -p | wc -l)
    while [ $current_processes -ge $max_processes ]; do
        sleep 1
        current_processes=$(jobs -p | wc -l)
    done

    # Run the process_genre function in the background
    process_genre "$genre" &
done

# Wait for all background processes to finish
wait


# Merge audio_features_data
echo "Merging audio_features_data..."
cat ./data/audio_features_data_*.csv > ./data/merged_audio_features_data.csv
echo "Merged audio_features_data file created."

# Merge genre_labels_data
echo "Merging genre_labels_data..."
cat ./data/genre_labels_data_*.csv > ./data/merged_genre_labels_data.csv
echo "Merged genre_labels_data file created."