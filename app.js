const express = require('express');
const path = require('path');
const app = express();
const config = require('dotenv').config();
const youtubeScraper = require("yt-trending-scraper")
const mongoose = require('mongoose');
const Schema = mongoose.Schema;


app.set('view engine', 'ejs');

const noSchema = new Schema({ _id: String }, { strict: false });
let Trending = mongoose.model('youtube', noSchema);

mongoose
	.connect(process.env.DB_URL, { useNewUrlParser: true, useUnifiedTopology: true })
	.then(() => {
		app.use('/assets', express.static(__dirname + '/assets'));
		app.get('/', function (req, res) {
			return Trending
				.aggregate([
					{ $limit: 60 },
					{
						$project: {
							timeText: 1,
							author: 1,
							title: 1,
							viewCount: 1,
							thumb: { $arrayElemAt: ['$videoThumbnails', 1] }
						}
					}
				])
				.exec()
				.then((trending) => {
					res.render(path.join(__dirname, './views/index'), { trending: trending });
				})
		});

		app.get('/video/:videoId', function (req, res) {
			console.log(req.params.videoId)
			return Trending
				.findOne({ _id: req.params.videoId })
				.lean()
				.exec()
				.then((video) => {
					res.render(path.join(__dirname, './views/details'), { video: video });
				})
		});

		app.get('/scrape', function (req, res) {
			youtubeScraper.scrape_trending_page('IN', true)
				.then((data) => {
					data = data.map((entry) => {
						return Trending
							.findOneAndUpdate({
								_id: entry.videoId
							}, {
								$set: entry,
								$setOnInsert: {
									_id: entry.videoId
								}
							}, {
								upsert: true
							});
					})
					return Promise.all(data)
				})
				.then((error) => {
					res.send({ success: true });
				})
				.catch((error) => {
					res.status(500).send({ success: false, error: error.message });
				});
		});

		app.listen(3000, function () {
			console.log('Listening at port 3000...');
		});
	})

