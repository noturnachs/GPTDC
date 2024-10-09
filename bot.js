const { Client, GatewayIntentBits } = require("discord.js");
const express = require("express");
const axios = require("axios"); // Import axios for making HTTP requests
const app = express();
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

require("dotenv").config();
const TOKEN = process.env.TOKEN; // Access the token from the environment variable

client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

// Function to send messages to both APIs
async function sendMessageToAPIs(userMessage) {
  const firstApiUrl =
    "https://nurvai-6764.chipp.ai/api/chat-history/message?chatSessionId=30329fba-f0ae-4596-a6a4-1cf4be40581f&appNameId=nurvAI-6764";
  const secondApiUrl = "https://nurvai-6764.chipp.ai/api/openai/chat";

  const headers = {
    Accept: "application/json, text/plain, */*",
    "Content-Type": "application/json",
    Cookie:
      "__Secure-next-auth.session-token=eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2R0NNIn0..VsvT3hWfRaEHdhKs.M8kBqVUvr0Y_q4B9AO0tMqUdLBcfTz4MKw_UqCDKI6YIZg9d6Yj5Pz6zc4-k0S8EnvBEfXiogeqdOPy3_J-2rCiZI7xLlL8RZredVds79H2pMDnQzkeqMau7bJ_YbPP7WTnoI9VjI5DC8N0WjZ2ftuhHl-w0Ph5QdwMSqCRFx68bXxYYbO_p.quKGAuHRsnKbmyWGXCf0XA; Path=/; Expires=Fri, 08 Nov 2024 11:47:39 GMT; HttpOnly; Secure; SameSite=Lax",
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
    Origin: "https://nurvai-6764.chipp.ai",
    Referer: "https://nurvai-6764.chipp.ai/",
  };

  // First API request
  const firstApiData = {
    type: "TEXT",
    content: userMessage,
    files: [],
    senderType: "USER",
  };

  try {
    const firstApiResponse = await axios.post(firstApiUrl, firstApiData, {
      headers,
    });
    console.log("Response from first API:", firstApiResponse.data);

    // Extract the openaiThreadId from the first API response
    const openaiThreadId = firstApiResponse.data.chatSession.openaiThreadId;

    // Prepare data for the second API request
    const secondApiData = {
      messageList: [
        {
          type: "TEXT",
          content: userMessage,
          senderType: "USER",
          files: [],
        },
      ],
      fileIds: [],
      threadId: openaiThreadId, // Use the extracted openaiThreadId
    };

    // Second API request
    const secondApiResponse = await axios.post(secondApiUrl, secondApiData, {
      headers,
    });
    console.log("Response from second API:", secondApiResponse.data);

    // Return the response from the second API
    return secondApiResponse.data;
  } catch (error) {
    console.error(
      "Error sending request:",
      error.response ? error.response.data : error.message
    );
    return null; // Return null in case of error
  }
}

function extractDeets(responseText, delimiter1, delimiter2) {
  const parts = responseText.split(delimiter1);
  if (parts.length > 1) {
    const subParts = parts[1].split(delimiter2);
    return subParts[0]; // Return the part before the second delimiter
  }
  return ""; // Return an empty string if no valid parts are found
}

// Function to get file data from the file URL
async function getFileData(fileUrl) {
  try {
    const response = await axios.get(fileUrl, {
      headers: {
        Accept: "*/*",
        Host: "nurvai-6764.chipp.ai",
        Origin: "https://nurvai-6764.chipp.ai",
        "content-type": "application/json",
        Referer: "https://nurvai-6764.chipp.ai/",
        Cookie:
          "__Secure-next-auth.session-token=eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2R0NNIn0..VsvT3hWfRaEHdhKs.M8kBqVUvr0Y_q4B9AO0tMqUdLBcfTz4MKw_UqCDKI6YIZg9d6Yj5Pz6zc4-k0S8EnvBEfXiogeqdOPy3_J-2rCiZI7xLlL8RZredVds79H2pMDnQzkeqMau7bJ_YbPP7WTnoI9VjI5DC8N0WjZ2ftuhHl-w0Ph5QdwMSqCRFx68bXxYYbO_p.quKGAuHRsnKbmyWGXCf0XA;",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
      },
    });
    return response.data; // Return the file data
  } catch (error) {
    console.error("Error retrieving the file:", error);
    throw new Error("Failed to retrieve file data.");
  }
}

function splitMessage(content) {
  const messages = [];
  let currentMessage = "";

  // Split the content into chunks of 2000 characters or fewer
  const words = content.split(" ");
  for (const word of words) {
    if (currentMessage.length + word.length + 1 <= 2000) {
      currentMessage += (currentMessage.length ? " " : "") + word;
    } else {
      messages.push(currentMessage);
      currentMessage = word;
    }
  }
  if (currentMessage) {
    messages.push(currentMessage);
  }

  return messages;
}

client.on("messageCreate", async (message) => {
  // Check if the message is from the bot itself
  if (message.author.id === client.user.id) return;

  // Check if the bot is mentioned
  if (message.mentions.has(client.user)) {
    // Get the content of the message after the mention
    const userMessage = message.content
      .split(" ") // Split the message by spaces
      .slice(1) // Get all parts after the first one
      .join(" ") // Join them back into a single string
      .trim(); // Trim any extra whitespace

    // Send an initial reply indicating processing
    const initialReply = await message.reply(
      `**You asked:** ${userMessage}\n***Processing your request, please wait...***`
    );

    // Call the function to send the message to both APIs
    const apiResponse = await sendMessageToAPIs(userMessage);

    // Prepare the response text
    if (apiResponse) {
      // Edit the initial reply to remove the processing text
      await initialReply.edit(`**You asked:** ${userMessage}`);

      // Extract the relevant part of the response
      let responseText = apiResponse
        .replace(/TOOL_CALL:.*? /g, "") // Remove the TOOL_CALL prefix
        .replace(/browseWeb/g, ""); // Remove the browseWeb part

      // Use the extractImageUrl function to get the image URL
      const imageUrl = extractDeets(responseText, "](", ")");

      const fileUrl = extractDeets(
        responseText,
        "(/api/openai/downloadFile?fileId=file-",
        ")"
      );

      // Check if an image URL was found
      if (extractDeets(responseText, "![", " for")) {
        console.log("\n\nImage URL:", imageUrl);
        // Send the image directly as an embedded image
        await message.channel.send({
          content: `**Here is the image you requested:**`,
          embeds: [
            {
              image: {
                url: imageUrl, // Use the image URL directly
              },
            },
          ],
        });
      } else if (fileUrl) {
        // Construct the full file URL
        const fullFileUrl =
          "https://nurvai-6764.chipp.ai/api/openai/downloadFile?fileId=file-" +
          fileUrl;
        console.log("File URL:", fullFileUrl);
        console.log("File Name:", getFileNameFromUrl(fullFileUrl));
        // Get the file data
        try {
          const fileData = await getFileData(fullFileUrl);
          const fileBase64 = fileData.fileBase64; // Assuming the response structure

          // Send the file as an attachment in Discord
          await message.channel.send({
            content: `**Here is the file you requested:**`,
            files: [
              {
                attachment: Buffer.from(fileBase64.split(",")[1], "base64"), // Convert base64 to buffer
                name: getFileNameFromUrl(fullFileUrl), // Specify the file name
              },
            ],
          });
        } catch (error) {
          await message.reply("There was an error retrieving the file.");
        }
      } else {
        // If no image URL or file URL is found, split the response text and send it
        // Split the response text into chunks of 2000 characters
        const messages = splitMessage(responseText);

        // Send each message chunk
        for (const msg of messages) {
          await message.channel.send(`**${msg}**`);
        }
      }
    } else {
      await message.reply("There was an error processing your request.");
    }
  }
});

function getFileNameFromUrl(url) {
  // Create a URL object
  const urlObj = new URL(url);

  // Get the value of the 'fileName' parameter from the query string
  const fileName = urlObj.searchParams.get("fileName");

  return fileName;
}

function strpos(haystack, needle, offset = 0) {
  // Convert to string to ensure haystack and needle are strings
  haystack = String(haystack);
  needle = String(needle);

  // If needle is an empty string, return the offset
  if (needle.length === 0) {
    return offset < haystack.length ? offset : false;
  }

  // Find the position of the needle in the haystack starting from the offset
  const position = haystack.indexOf(needle, offset);

  // Return the position or false if not found
  return position !== -1 ? position : false;
}

// Set up a simple Express server
app.get("/", (req, res) => {
  res.send("Bot is running!");
});

// Start the Express server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

client.login(TOKEN);
