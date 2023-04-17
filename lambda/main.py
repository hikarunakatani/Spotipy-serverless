import spotipy
import spotipy.util as util
import common
import argparse
import random
import os
import csv

# For local testing
local_test_flag = True

# Unflag local testing flag when runnig on AWS environment
if os.getenv('ON_AWS'):
    local_test_flag = False

sp = common.authenticate(local_test_flag)
secret = common.get_secret(local_test_flag)
username = secret['username']
playlist_id = secret['playlist_id']
genre_seeds = sp.recommendation_genre_seeds()['genres']
audio_features_names = ['danceability', 'energy', 'key', 'loudness', 'mode',
                            'speechiness', 'acousticness', 'instrumentalness', 'liveness', 'valence', 'tempo']

def get_random_search():
    """Get a random character of unicode.
    """

    rand_char = ''

    while rand_char == '':
        rand_char = chr(random.randint(0, 1114111))

    random_search = ''

    if random.randint(0, 2) == 0:
        random_search = rand_char + '%'
    elif random.randint(0, 2) == 1:
        random_search = '%' + rand_char + '%'
    else:
        random_search = '%' + rand_char

    return random_search


def diggin_in_the_crate(num_tracks=30, remove_current_items=False):
    """Search completely random tracks.


    Args:
        num_tracks (int, optional): A number of tracks to add to playlist. Defaults to 30.
        remove_current_items (bool, optional): Whether to remove current items in playlist or not.
    """

    current_items = sp.playlist_items(playlist_id)

    # Delete existing tracks
    if current_items['items'] and remove_current_items:
        remove_items = []
        for items in current_items['items']:
            remove_items.append(items['track']['uri'])

        sp.playlist_remove_all_occurrences_of_items(playlist_id, remove_items)
        print("Removed current tracks.")

    # Get a list of country codes
    country_codes = sp.country_codes
    country_num = len(country_codes)

    track_ids = []
    track_artists = []

    # Add tracks
    print("Start searching...")

    while len(track_ids) < num_tracks:
        random_market = country_codes[random.randint(0, country_num - 1)]
        query = get_random_search()
        random_offset = random.randint(0, 999)
        results = sp.search(type='track', offset=random_offset,
                            limit=1, q=query, market=[random_market])

        if results and len(results['tracks']['items']) >= 1:
            track = results['tracks']['items'][0]
            track_name = track['name']
            # When there are multiple artists
            if len(track['artists']) >= 2:
                 for artist in track['artists']:
                    track_artists.append(artist['name'])
            else:
                track_artists.append(
                    track['artists'][0]['name'])

            # Add track ids
            track_ids.append((track['id']))
            sp.user_playlist_add_tracks(
                username, playlist_id, track_ids[-1:])
            print(
                f"Added {track_name} - {','.join(track_artists)} to the playlist.")
            track_artists.clear()

    print("Updated playlist.")

def initialize_data(track, genre):    

    audio_features = []
    # Initialize correct label of each of 126 genres
    genre_labels = [0] * 126
    track_id = track['id']
    track_audio_features = sp.audio_features(track_id)[0]

    # Obtain audio features from each tracks' metadata
    for audio_features_name in audio_features_names:
        audio_features.append(track_audio_features[audio_features_name])

    # Set label of corresponding genre lable to 
    genre_labels[genre_seeds.index(genre)] = 1

    return audio_features, genre_labels

def get_data(genre):
    audio_features_data = []
    genre_labels_data = []

    # Get extra 10 recommended tracks based on tacks id of each track
    results_genre = sp.recommendations(seed_genres=[genre], limit=10)
    for track in results_genre['tracks']:
        audio_features, genre_labels = initialize_data(track, genre)
        audio_features_data.append(audio_features)
        genre_labels_data.append(genre_labels)
        print(f'{genre} audio features has been added.')
        results_tracks = sp.recommendations(seed_tracks=[track['id']], limit=10)
        for track in results_tracks['tracks']:
            audio_features, genre_labels = initialize_data(track, genre)
            audio_features_data.append(audio_features)
            genre_labels_data.append(genre_labels)
            print(f'{genre}-recommended track audio features has been added.')

    with open('./audio_features_data.csv', 'w', newline="") as f:
        writer = csv.writer(f)
        writer.writerows(audio_features_data)

    with open('./genre_labels_data.csv', 'w', newline="") as f:
        writer = csv.writer(f)
        writer.writerows(genre_labels_data)

 
def main():
    """ main function for local testing
    """

    parser = argparse.ArgumentParser(
        description='This program is for manipulating Spotify using SpotifyAPI.')

    parser.add_argument('function', help='specify a function to use')

    parser.add_argument('--num_tracks', type=int,
                        help='A number of tracks to add')

    parser.add_argument('--remove_current_items', type=bool,
                        help='Whether to remove corrent tracks or not')
    parser.add_argument('--genre', type=str,
                        help='song genre to add to playlist')
    args = parser.parse_args()

    if args.function == 'ditc':
        if args.num_tracks:
            diggin_in_the_crate(num_tracks=args.num_tracks,
                                remove_current_items=args.remove_current_items)
        else:
            print("Please set the number of tracks to search.")
    elif args.function == 'get_data':
        get_data(args.genre)
    else:
        print("Please specify the fucntion name properly.")


if __name__ == '__main__':
    main()
