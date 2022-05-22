import { TwitterApi } from 'twitter-api-v2'
import dotenv from 'dotenv';
import { isMainThread } from 'worker_threads';
dotenv.config({ path: '.env' });


async function main(){
    try {
        //Initialize the Twitter API tokens
        const userClient = new TwitterApi({
            appKey: process.env.TWITTER_API_KEY!,
            appSecret: process.env.TWITTER_API_KEY_SECRET!,
            accessToken: process.env.TWITTER_ACCESS_TOKEN!,
            accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET!,
        });

        const searchMentionnedTweets = await userClient.v2.search('@CoinFlipBotFR', { expansions: ['author_id', 'in_reply_to_user_id', 'referenced_tweets.id'], 'user.fields': ['username'] });

        const meUser = await userClient.v2.me();

        for (const tweet of searchMentionnedTweets) {
            let replied: boolean = false;
            let isAResponse: boolean = false;
            if (tweet.author_id !== meUser.data.id) {
                if (tweet.referenced_tweets !== undefined){
                    for (const referencedTweet of tweet.referenced_tweets){
                        if (referencedTweet.type === "replied_to"){
                            isAResponse = true;
                        }
                    }
                }
                const verifyQuotedReplies = await userClient.v2.quotes(tweet.id, { expansions: ['author_id'], 'user.fields': ['username'] });



                
                for await (const quote of verifyQuotedReplies) {
                    const quotedTweetAuthor = quote.author_id;
                  
                    if (quotedTweetAuthor === meUser.data.id) {
                        replied = true;
                    }
                }


                const tweetCleaned = tweet.text.replace('@CoinFlipBotFR', '').trim();

                const words = tweetCleaned.split(' ')

                if(!replied && !isAResponse) {
                    if ( words.length === 3 && words[1] === "/") {
                        const firstChoice = words[0];
                        const secondChoice = words[2];
    
                        const result = await coinFlip(firstChoice, secondChoice);
    
                        await userClient.v2.quote("Le choix est fait : " + result, tweet.id);
                    } else {
                        console.log("mauvais format")
                    }
                }
            }
        }


    } catch (error) {
        console.error(error);
    }
}



async function coinFlip(firstChoice: string, secondChoice: string) {
    const choice: number = Math.floor(Math.random() * 2); // 0 or 1

    return choice === 0 ? firstChoice : secondChoice;
}

setInterval(main, 1000 * 60 * 1);