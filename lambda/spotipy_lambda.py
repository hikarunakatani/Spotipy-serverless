import spotipy
import spotipy.util as util
import common
import argparse
import random


def diggin_in_the_crate(num_tracks=30, local_test_flag=False):
    """Search completely random songs.


    Args:
        num_tracks (int, optional): A number of tracks to add to playlist. Defaults to 30.
        local_test_flag (Boolean, optional): A flag whether to enable local testing or not. 
    """

    sp = common.authenticate(local_test_flag)
    secret = common.get_secret(local_test_flag)
    username = secret['username']
    playlist_id = secret['playlist_id']
    current_items = sp.playlist_items(playlist_id)

    if current_items['items']:
        remove_items = []

        for items in current_items['items']:
            remove_items.append(items['track']['uri'])

        sp.playlist_remove_all_occurrences_of_items(playlist_id, remove_items)
        print("Removed current songs.")

    # Get a list of country codes
    country_codes = sp.country_codes
    country_num = len(country_codes)

    track_ids = []
    track_name = ''
    track_artists = []

    print("Start searching...")

    # Add songs
    while len(track_ids) < num_tracks:

        random_market = country_codes[random.randint(0, country_num - 1)]

        query = common.get_random_search()

        random_offset = random.randint(0, 999)

        results = sp.search(type='track', offset=random_offset,
                            limit=1, q=query, market=[random_market])

        if results is not None:
            if len(results['tracks']['items']) >= 1:

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
                print('Added {} - {} to the playlist.'.format(track_name,
                      ','.join(track_artists)))
                track_artists.clear()

            else:
                pass

    sp.user_playlist_add_tracks(username, playlist_id, track_ids)
    print("Updated playlist.")

# todo
def playback_song(song_name):
    sp = common.authenticate()

    devices = sp.devices()
    for device in devices['devices']:
        if device['name'] == 'LAPTOP-Q6UU6C1V':
            device_id = device['id']

    songname = song_name

    results = sp.search(type='track',
                        limit=1, q=songname)

    track_uri = results['tracks']['items'][0]['uri']
    sp.start_playback(device_id, uris=[track_uri])


def main():
    """ main function for local testing
    """

    parser = argparse.ArgumentParser(
        description='This program is for manipulating Spotify using SpotifyAPI.')

    parser.add_argument('function', help='specify a function to use')

    parser.add_argument('--num_tracks', type=int,
                        help='a number of songs to add')

    parser.add_argument('--song_name', type=str,
                        help='a name of song to seach')

    args = parser.parse_args()

    if args.function == 'ditc':
        if args.num_tracks:
            diggin_in_the_crate(num_tracks=args.num_tracks,
                                local_test_flag=True)
        else:
            diggin_in_the_crate(local_test_flag=True)

    elif args.function == 'playback_song' and args.song_name:
        playback_song(args.song_name)

    else:
        print("please specify the fucntion name properly.")
    # todo


if __name__ == '__main__':
    main()
