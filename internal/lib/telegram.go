package lib

import (
	"fmt"
	"log"
	"time"

	tb "gopkg.in/tucnak/telebot.v2"
)

var Tg *tb.Bot = nil
var TgLoginURL string

// Mock points for testing
var InitTelegram = initTelegram
var StartTelegram = startTelegram
var SendTelegramMsg = sendTelegramMsg

func initTelegram(token string, db *Database, allowNewUsers bool) {
	// Telegram connection

	if token == "" {
		log.Println("WARNING: Telegram initalization skipped")
		Tg = nil
		return
	}

	bot, err := tb.NewBot(tb.Settings{
		Token:  token,
		Poller: &tb.LongPoller{Timeout: 10 * time.Second},
	})
	if err != nil {
		log.Fatal(err)
	}

	TgLoginURL = "https://telegram.me/" + bot.Me.Username + "?start"
	log.Println("Telegram URL:", TgLoginURL)

	bot.Handle("/start", func(m *tb.Message) {
		log.Printf("/start received from %s - %d", m.Sender.Username, m.Sender.ID)
		// cmd payload would be at m.Payload
		u := User{
			Name: m.Sender.Username,
			TgId: int64(m.Sender.ID),
		}

		if !allowNewUsers {
			adminMsg := fmt.Sprintf("To request access, please contact the administrator with the following information:\nUsername: %s\nTelegram ID: %d",
				u.Name, u.TgId)
			bot.Send(m.Sender, adminMsg)
			return
		}

		created := db.CreateOrGetUserKeyByTelegramId(&u)
		if created {
			bot.Send(m.Sender, fmt.Sprintf("Welcome! Your access key:\n%s", u.Key))
		} else {
			bot.Send(m.Sender, fmt.Sprintf("Here's your access key:\n%s", u.Key))
		}
	})

	Tg = bot
}

func startTelegram() {
	if Tg == nil {
		return
	}
	Tg.Start()
}

func sendTelegramMsg(tgid int64, msg string) {
	if Tg == nil {
		return
	}
	chat := tb.Chat{ID: tgid}
	Tg.Send(&chat, msg)
}
