
DEFAULT_SONG_LIST = [
    "Mr. Brightside - The Killers", "Toxic - Britney Spears", "Hey Ya! - Outkast",
    "Umbrella - Rihanna", "Single Ladies - Beyonce", "Bad Romance - Lady Gaga",
    "Lose Yourself - Eminem", "Since U Been Gone - Kelly Clarkson", "Rolling in the Deep - Adele",
    "Uptown Funk - Mark Ronson ft. Bruno Mars", "Shake It Off - Taylor Swift", "Blinding Lights - The Weeknd",
    "Old Town Road - Lil Nas X", "Despacito - Luis Fonsi", "Hotline Bling - Drake",
    "Party in the USA - Miley Cyrus", "Poker Face - Lady Gaga", "In Da Club - 50 Cent",
    "Yeah! - Usher", "Hips Don't Lie - Shakira", "Firework - Katy Perry",
    "Call Me Maybe - Carly Rae Jepsen", "Happy - Pharrell Williams", "Stay - Justin Bieber",
    "drivers license - Olivia Rodrigo", "Thank U, Next - Ariana Grande", "Bad Guy - Billie Eilish",
    "Levitating - Dua Lipa", "Flowers - Miley Cyrus", "As It Was - Harry Styles",
    "Can't Stop the Feeling - Justin Timberlake", "Cheap Thrills - Sia", "All About That Bass - Meghan Trainor",
    "Counting Stars - OneRepublic", "Timber - Pitbull ft. Kesha", "Wrecking Ball - Miley Cyrus",
    "Get Lucky - Daft Punk", "Royals - Lorde", "Locked Out of Heaven - Bruno Mars",
    "Somebody That I Used to Know - Gotye", "Starships - Nicki Minaj", "We Found Love - Rihanna",
    "Moves Like Jagger - Maroon 5", "Super Bass - Nicki Minaj", "Rolling in the Deep - Adele",
    "Dynamite - Taio Cruz", "Tik Tok - Kesha", "Empire State of Mind - Jay-Z ft. Alicia Keys",
    "I Gotta Feeling - Black Eyed Peas", "Poker Face - Lady Gaga", "Viva La Vida - Coldplay",
    "Low - Flo Rida", "Apologize - OneRepublic", "Bleeding Love - Leona Lewis",
    "Crank That - Soulja Boy", "Stronger - Kanye West", "Umbrella - Rihanna",
    "Irreplaceable - Beyonce", "Big Girls Don't Cry - Fergie", "Promiscuous - Nelly Furtado",
    "Hips Don't Lie - Shakira", "You're Beautiful - James Blunt", "Gold Digger - Kanye West",
    "Since U Been Gone - Kelly Clarkson", "Hollaback Girl - Gwen Stefani", "Boulevard of Broken Dreams - Green Day",
    "Yeah! - Usher", "Burn - Usher", "Toxic - Britney Spears",
    "Crazy in Love - Beyonce", "In Da Club - 50 Cent", "Get Busy - Sean Paul",
    "Bring Me to Life - Evanescence", "Lose Yourself - Eminem", "Hot in Herre - Nelly",
    "Complicated - Avril Lavigne", "A Thousand Miles - Vanessa Carlton", "Dilemma - Nelly ft. Kelly Rowland",
    "Fallin' - Alicia Keys", "Lady Marmalade - Christina Aguilera", "All for You - Janet Jackson",
    "Ms. Jackson - Outkast", "Beautiful Day - U2", "Yellow - Coldplay",
    "Bye Bye Bye - *NSYNC", "Oops!... I Did It Again - Britney Spears", "Stan - Eminem",
    "Kryptonite - 3 Doors Down", "Teenage Dream - Katy Perry", "Sugar, We're Goin Down - Fall Out Boy",
    "Welcome to the Black Parade - My Chemical Romance", "Mr. Brightside - The Killers", "Seven Nation Army - The White Stripes",
    "Feel Good Inc - Gorillaz", "Valerie - Amy Winehouse", "Chandelier - Sia",
    "Take Me To Church - Hozier", "Espresso - Sabrina Carpenter", "Not Like Us - Kendrick Lamar",
    "Good 4 U - Olivia Rodrigo"
]

MODE_CONFIGS = {
    "CLASSIC": {
        "input_list": True,
        "default_list": DEFAULT_SONG_LIST,
    },
    "BLIND_KARAOKE": {
        "input_list": False,
        "fallback_prompts": []
    }
}

