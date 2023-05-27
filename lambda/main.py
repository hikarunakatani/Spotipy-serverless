import argparse
import random
import os
import csv
import common


# For local testing
LOCAL_TEST_FLAG = True

# Unflag local testing flag when runnig on AWS environment
if os.getenv('ON_AWS'):
    LOCAL_TEST_FLAG = False

sp = common.authenticate(LOCAL_TEST_FLAG)
secret = common.get_secret(LOCAL_TEST_FLAG)
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
    """
    Search completely random tracks.

    Args:
        num_tracks (int, optional): Number of tracks to add to the playlist. Defaults to 30.
        remove_current_items (bool, optional): Whether to remove current items in the playlist or not.
    """

    # Retrieve current items in the playlist
    current_items = sp.playlist_items(playlist_id)

    # Delete existing tracks if remove_current_items is True
    if remove_current_items and current_items['items']:
        remove_items = [item['track']['uri']
                        for item in current_items['items']]
        sp.playlist_remove_all_occurrences_of_items(playlist_id, remove_items)
        print("Removed current tracks.")

    # Get a list of country codes
    country_codes = sp.country_codes
    country_num = len(country_codes)

    track_ids = []

    # Add tracks
    print("Start searching...")

    while len(track_ids) < num_tracks:
        random_market = random.choice(country_codes)
        query = get_random_search()
        random_offset = random.randint(0, 999)
        results = sp.search(type='track', offset=random_offset,
                            limit=1, q=query, market=[random_market])

        if results and len(results['tracks']['items']) >= 1:
            track = results['tracks']['items'][0]
            track_name = track['name']
            track_artists = [artist['name'] for artist in track['artists']]

            # Add track ids
            track_ids.append(track['id'])
            sp.user_playlist_add_tracks(username, playlist_id, [track_ids[-1]])
            print(
                f"Added {track_name} - {', '.join(track_artists)} to the playlist.")

    print("Updated playlist.")


def initialize_data(track_ids, genre):
    """_summary_

    Args:
        track_ids (_type_): _description_
        genre (_type_): _description_

    Returns:
        _type_: _description_
    """

    # Initialize correct label of each of 126 genres
    genre_labels = []
    audio_features = []

    batch_audio_features = sp.audio_features(track_ids)
    # Obtain audio features from each tracks' metadata
    for track_audio_features in batch_audio_features:
        if track_audio_features:
            extracted_audio_features = [track_audio_features[audio_features_name]
                                        for audio_features_name in audio_features_names]
            audio_features.append(extracted_audio_features)

            # Set label of corresponding genre lable to
            genre_label = [1 if i == genre_seeds.index(genre) else 0 for i in range(126)]
            genre_labels.append(genre_label)
        else:
            print("track_audio_features is None.")

    # sp.user_playlist_add_tracks(
    #    username, playlist_id, track_ids)

    return audio_features, genre_labels


def get_data(genre, limit):
    """_summary_

    Args:
        genre (_type_): _description_
        limit (_type_): _description_
    """

    audio_features_data = []
    genre_labels_data = []

    # Get tracks based on genre
    results_genre = sp.recommendations(seed_genres=[genre], limit=limit)
    track_ids = [track['id'] for track in results_genre['tracks']]
    audio_features, genre_labels = initialize_data(track_ids, genre)
    audio_features_data.append(audio_features)
    genre_labels_data.append(genre_labels)

    for track in results_genre['tracks']:
        # Get recommended tracks based on tacks id of each track
        results_tracks = sp.recommendations(
            seed_tracks=[track['id']], limit=limit)
        track_ids = [track['id'] for track in results_tracks['tracks']]
        audio_features, genre_labels = initialize_data(track_ids, genre)
        audio_features_data.append(audio_features)
        genre_labels_data.append(genre_labels)

    print(f'{genre} track audio features have been added.')

    with open('./data/audio_features_data_{}.csv'.format(genre), 'w', newline="") as f:
        writer = csv.writer(f)
        # Delete extra dimension of array
        writer.writerows(sum(audio_features_data, []))

    with open('./data/genre_labels_data_{}.csv'.format(genre), 'w', newline="") as f:
        writer = csv.writer(f)
        # Delete extra dimension of array
        writer.writerows(sum(genre_labels_data, []))


def delete_tracks():
    while sp.playlist_items(playlist_id)['items']:
        current_items = sp.playlist_items(playlist_id)
        remove_items = []
        for items in current_items['items']:
            remove_items.append(items['track']['uri'])

        sp.playlist_remove_all_occurrences_of_items(playlist_id, remove_items)
    print("Removed current tracks.")


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
    parser.add_argument('--limit', type=int,
                        help='song genre to add to playlist')
    args = parser.parse_args()

    if args.function == 'ditc':
        if args.num_tracks:
            diggin_in_the_crate(num_tracks=args.num_tracks,
                                remove_current_items=args.remove_current_items)
        else:
            print("Please set the number of tracks to search.")
    elif args.function == 'get_data':
        get_data(genre=args.genre, limit=args.limit)
    elif args.function == 'delete_tracks':
        delete_tracks()
    else:
        print("Please specify the fucntion name properly.")


if __name__ == '__main__':
    main()
