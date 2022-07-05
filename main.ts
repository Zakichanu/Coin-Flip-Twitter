import { TwitterApi } from 'twitter-api-v2'
import dotenv from 'dotenv';
import { isMainThread } from 'worker_threads';
dotenv.config({ path: '.env' });

// Main function
async function main() {
    try {
        //Initialize the Twitter API tokens
        const userClient = new TwitterApi({
            appKey: process.env.TWITTER_API_KEY!,
            appSecret: process.env.TWITTER_API_KEY_SECRET!,
            accessToken: process.env.TWITTER_ACCESS_TOKEN!,
            accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET!,
        });

        // Search for mentions tweet
        const searchMentionnedTweets = await userClient.v2.search('@CoinFlipBotFR', { expansions: ['author_id', 'in_reply_to_user_id', 'referenced_tweets.id'], 'user.fields': ['username'] });

        // Retrieve logged user (@CoinFlipBotFR in that case)
        const meUser = await userClient.v2.me();

        // Looping through the last 4 mentionned tweets
        for (let i:number = 0; i<4; i++) {
            // Retrieve tweet
            const tweet = searchMentionnedTweets.data.data[i];
            
            let replied: boolean = false;
            let isAResponse: boolean = false;

            // If the author of the mentionned tweet is not the logged user
            if (tweet.author_id !== meUser.data.id) {

                // Not retrieving replied tweets
                if (tweet.referenced_tweets !== undefined) {
                    for (const referencedTweet of tweet.referenced_tweets) {
                        if (referencedTweet.type === "replied_to") {
                            isAResponse = true;
                        }
                    }
                }



                // Removing retweeted quotes by other accounts made by logged user
                if(tweet.text.includes("RT @CoinFlipBotFR:")){
                    isAResponse = true;
                }

                // If the tweet is not a response
                if (!isAResponse) {
                    // Verifying quotes of the actual tweet to see if the bot didn't reply to it
                    const verifyQuotedReplies = await userClient.v2.quotes(tweet.id, { expansions: ['author_id'], 'user.fields': ['username'] });
                    for await (const quote of verifyQuotedReplies) {
                        const quotedTweetAuthor = quote.author_id;

                        if (quotedTweetAuthor === meUser.data.id) {
                            replied = true;
                        }
                    }

                    // Refactoring the tweet to process the coin flip
                    const tweetCleaned = tweet.text.replace('@CoinFlipBotFR', '').trim();
                    const words = tweetCleaned.split('/')

                    // Checking before processing
                    if (!replied) {
                        // LOG.debug
                        console.log(new Date().toString() + " " + tweet.text);

                        // Getting the right format
                        if (words.length === 2) {
                            const firstChoice : string = words[0].trim();
                            const secondChoice : string = words[1].trim();

                            // Returning result
                            const result = await coinFlip(firstChoice, secondChoice);

                            // Replying to tweet
                            await userClient.v2.quote(result, tweet.id);
                        }
                        else if (words.length === 0) {
                            const result = await coinFlip("pile", "face");

                            // Replying to tweet
                            await userClient.v2.quote(result, tweet.id);
                        } 
                        else {
                            console.log(new Date().toString() + " : Error while processing tweet : '" + tweet.text + "' is not a valid format to process the coin flip");
                        }
                    }
                }
            }
        }


    } catch (error) {
        console.error(error); // Log the error
    }
}


// CoinFlip algorithm
async function coinFlip(firstChoice: string, secondChoice: string) {
    const choice: number = Math.floor(Math.random() * 2); // 0 or 1

    return choice === 0 ? firstChoice : secondChoice;
}

// Calling main function every five minutes
setInterval(main, 1000 * 60 * 1); 