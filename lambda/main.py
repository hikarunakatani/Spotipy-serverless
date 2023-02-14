import spotipy
import spotipy.util as util
import common
import argparse
import random
import numpy as np
import os
import csv

local_test_flag = True

if os.getenv('ON_AWS'):
    local_test_flag = False

sp = common.authenticate(local_test_flag)
secret = common.get_secret(local_test_flag)
username = secret['username']
playlist_id = secret['playlist_id']
audio_features_names = ['danceability', 'energy', 'key', 'loudness', 'mode',
                        'speechiness', 'acousticness', 'instrumentalness', 'liveness', 'valence', 'tempo']
genre_seeds = sp.recommendation_genre_seeds()['genres']


def diggin_in_the_crate(num_tracks=30, remove_current_items=False):
    """Search completely random songs.


    Args:
        num_tracks (int, optional): A number of tracks to add to playlist. Defaults to 30.
    """

    current_items = sp.playlist_items(playlist_id)

    # Delete existing songs
    if current_items['items'] and remove_current_items:
        remove_items = []
        for items in current_items['items']:
            remove_items.append(items['track']['uri'])

        sp.playlist_remove_all_occurrences_of_items(playlist_id, remove_items)
        print("Removed current songs.")

    # Get a list of country codes
    country_codes = sp.country_codes
    country_num = len(country_codes)

    track_ids = []
    track_artists = []

    # Add songs
    print("Start searching...")

    while len(track_ids) < num_tracks:
        random_market = country_codes[random.randint(0, country_num - 1)]
        query = common.get_random_search()
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


def calc_genres_audio_features():

    genres_audio_features = []
    audio_features_list = [[] for i in range(len(audio_features_names))]

    for genre in genre_seeds:
        results = sp.recommendations(seed_genres=[genre], limit=1)

        for track in results['tracks']:
            track_id = track['id']
            track_audio_features = sp.audio_features(track_id)[0]

            for audio_features, audio_features_name in zip(audio_features_list, audio_features_names):
                audio_features.append(
                    track_audio_features[audio_features_name])

        genres_audio_features.append(
            [np.mean(audio_features) for audio_features in audio_features_list])

        print(f'{genre} audio features has been calculated.')

    with open('./genres_audio_features.csv', 'w', newline="") as f:
        writer = csv.writer(f)
        writer.writerows(genres_audio_features)


def judge_track_genre():

    playlist_items = sp.playlist_items(playlist_id)

    for index, track in enumerate(playlist_items['items']):
        playlist_item_audio_features = []
        playlist_item_track_id = track['track']['id']
        audio_features = sp.audio_features(playlist_item_track_id)[0]

        for audio_features_name in audio_features_names:
            playlist_item_audio_features.append(
                audio_features[audio_features_name])

        mse = []
        playlist_item_audio_features = np.array(
            playlist_item_audio_features, dtype=object)

        with open('./genres_audio_features.csv') as f:
            reader = csv.reader(f)

            for genre_audio_feature, genre in zip(reader, genre_seeds):
                genre_audio_feature_float = []

                for item in genre_audio_feature:
                    genre_audio_feature_float.append(float(item))

                genre_audio_feature_ndarray = np.array(
                    genre_audio_feature_float, dtype=object)
                mse.append(
                    np.mean((playlist_item_audio_features - genre_audio_feature_ndarray) ** 2))

        min_mse_index = mse.index(min(mse))
        print(f'Song{index} genre is {genre_seeds[min_mse_index]}')


def test(genre):
    results = sp.recommendations(seed_genres=[genre], limit=50)

    track_ids = []
    for track in results['tracks']:
        track_ids.append((track['id']))
        sp.user_playlist_add_tracks(
            username, playlist_id, track_ids[-1:])


def main():
    """ main function for local testing
    """

    parser = argparse.ArgumentParser(
        description='This program is for manipulating Spotify using SpotifyAPI.')

    parser.add_argument('function', help='specify a function to use')

    parser.add_argument('--num_tracks', type=int,
                        help='A number of songs to add')

    parser.add_argument('--remove_current_items', type=bool,
                        help='Whether to remove corrent songs or not')
    parser.add_argument('--genre', type=str,
                        help='song genre to add to playlist')
    args = parser.parse_args()

    if args.function == 'ditc':
        if args.num_tracks:
            diggin_in_the_crate(num_tracks=args.num_tracks,
                                remove_current_items=args.remove_current_items)
        else:
            print("Please set the number of tracks to search.")
    elif args.function == 'calc_genres_audio_features':
        calc_genres_audio_features()
    elif args.function == 'judge_track_genre':
        judge_track_genre()
    elif args.function == 'test':
        test(args.genre)
    else:
        print("Please specify the fucntion name properly.")


if __name__ == '__main__':
    main()
