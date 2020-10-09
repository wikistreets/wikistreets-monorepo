// express
const express = require('express')
const { body, param, query, validationResult } = require('express-validator')
const uuidv4 = require('uuid/v4')
const path = require('path')
const multer = require('multer') // middleware for uploading files - parses multipart/form-data requests, extracts the files if available, and make them available under req.files property.

// authentication
const jwt = require('jsonwebtoken')
const passport = require('passport')
const passportConfig = require('../passportConfig')

// map-specific stuff
const turf = require('@turf/turf')

// database schemas and models
const mongoose = require('mongoose')
const ObjectId = require('mongoose').Types.ObjectId
const { FeatureCollection } = require('../models/feature-collection')
// const { Feature } = require('../models/feature')
const { User } = require('../models/user')

// emailer
const { EmailService } = require('../services/EmailService')
const { Invitation } = require('../models/invitation')

// markdown support
// const marked = require('marked')

// Set options
// `highlight` example uses `highlight.js`
// marked.setOptions({
//   renderer: new marked.Renderer(),
//   // highlight: function(code, language) {
//   //   const hljs = require('highlight.js');
//   //   const validLanguage = hljs.getLanguage(language) ? language : 'plaintext';
//   //   return hljs.highlight(validLanguage, code).value;
//   // },
//   pedantic: false,
//   gfm: true,
//   breaks: false,
//   sanitize: false,
//   smartLists: true,
//   smartypants: false,
//   xhtml: false,
// })

const mapRouter = ({ config }) => {
  // create an express router
  const router = express.Router()

  // load up the jwt passport settings
  passportConfig({ config: config.jwt })

  // our passport strategies in action
  const passportJWT = passport.authenticate('jwt', { session: false })

  // memory storage
  const storage = multer.memoryStorage()

  // filter out non-images
  const multerFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image')) {
      cb(null, true)
    } else {
      cb('Please upload only images.', false)
    }
  }

  const upload = multer({
    storage: storage,
    fileFilter: multerFilter,
    limits: {
      fileSize: config.markers.maxImageFileSize,
    },
    onError: function (err, next) {
      console.log('error', err)
      next(err)
    },
  })

  // route to rename a map
  router.post(
    '/map/title/:featureCollectionId',
    passportJWT,
    upload.none(),
    [
      body('featureCollectionId').not().isEmpty().trim(),
      body('featureCollectionTitle').not().isEmpty().trim().escape(),
    ],
    async (req, res) => {
      const featureCollectionId = req.body.featureCollectionId
      const featureCollectionTitle = req.body.featureCollectionTitle

      // check for validation errors
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Please enter a more reasonable map title.',
        })
      }

      // console.log(`MAP TITLE: ${featureCollectionTitle}`)
      const featureCollection = await FeatureCollection.findOneAndUpdate(
        { publicId: featureCollectionId },
        { title: featureCollectionTitle },
        { upsert: true }
      ).catch((err) => {
        return res.status(500).json({
          status: false,
          message:
            'Sorry... something bad happened on our end!  Please try again.',
          error: 'Sorry... something bad happened on our end!  ',
        })
      })

      res.json({
        status: true,
        message: 'success',
        data: featureCollection,
      })
    }
  )

  router.get('/map/upgrade', async (req, res) => {
    const data = {
      type: 'FeatureCollection',
      publicId: '5e65a41d-7101-4606-8081-c3eddea137f5',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: ['24.0626', '49.4608'],
          },
          user: '5f4c0aaf50cd630e33c20bc8',
          properties: {
            title: 'The Kestlers of Rozdol',
            address: 'Палац Жевуських-Лянцкоронських, Розділ, Lviv, Ukraine',
            photos: [],
            body:
              'Rozdol was a small town with population of about 1,000 around 1820 rising to about 4,000 at its peak later in the century.  Half the population were Jewish.  The town had two hasidic courts starting around 1820s.  Jews earned their livelihood selling produce to neighbouring villages and servicing the hasidic courts.\r\n\r\n## Mincze/Mina Kestler\r\nBorn about 1848 in Rozdol, Ukraine.  Died 9 Sep 1918 in Vienna.\r\n- Daughter of David Wolf Kestler and Chaia/Chaje Graupen\r\n- Wife of [Mendel Zuckerberg](#5f70f6eb1330074062b65ff6)\r\n- Mother of [David Kessler](##5f70f6eb1330074062b65ff6)\r\n\r\nThe family surname was generally spelt Kestler in older records but was standardized to Kessler by the time the family moved to Vienna.  \r\n\r\nAustrian burial records shows death of Mina Kessler buried 9 Sep 1918 Wiener Zentralfriedhof T1 Group 8 Row 19 Grave 013A - same plot as [Mendel Zuckerberg](#5f70f6eb1330074062b65ff6).  Her grand-daughter, Edith, was told that Mincze was standing on a chair in her son’s Vienna apartment fixing some curtains when she fell and hit her head.  The death records show an age of 70 years, implying birth year 1848. However, LDS microfilm of Rozdol shows her birth registration as 1 Mar 1852.  Is it possible that she was born four years before her birth was registered?  Or possibly her children did not know her accurate birth date - but a difference of four years is large! \r\n\r\nThe Kestler extended family clan may have arrived in Rozdol in the 1830s and the children left in the 1870s, many to Boryslaw/Drohobycz.',
            comments: [],
            zoom: 9,
          },
        },
        {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: ['23.511257171630863', '49.35328048968759'],
          },
          user: '5f4c0aaf50cd630e33c20bc8',
          properties: {
            title: 'The Zuckerbergs &amp; Kesslers of Drohobycz',
            address:
              'Хоральна Синагога &#x2F; Choral Synagogue, вул. Пилипа Орлика, Дрогобич, Lviv, Ukraine',
            photos: [],
            body:
              'Drohobycz is today in the Ukraine but before WWI was in the eastern part of the province of Galicia in the Austro-Hungarian Empire.  The area of Boryslaw & Drohobycz became a boomtown after the beginning of serious oil and ozoberite (natural wax) exploitation starting around 1860, which attracted a lot of Jews to the area; it became known as the Galician ‘Krondike’ or California.  In 1890, the population of Drohobycz was 10,424 of which 74% were Jews.\r\n\r\n## Mendel Zuckerberg\r\nBorn 1847 in Drohobycz.  Died 15 Apr 1905 in Vienna.\r\n- Husband of [Mina Kestler](#5f70f1621330074062b65eb1)\r\n- Father of David Kessler\r\n\r\nDied 15 Apr 1905 in Vienna; his death record gives his profession as ‘Hausierer’ or Peddler, though his grand-daughter, Edith, was told he was a tailor.  \r\n\r\n## David Leib Kessler\r\nBorn in Drohobycz 3 January 1889.  Died in Vienna.\r\n- Son of [Mendel Zuckerberg](#5f70f6eb1330074062b65ff6) and [Mincze/Mina Kestler](#5f70f1621330074062b65eb1)\r\n- Husband of [Pauline Barber](#5f7102476d7d696041b3e2bb)\r\n- Father of [Edith Horton](#5f716890c45e1e7223f4a1ac)\r\n\r\n![David Leib & Pauline Kessler](/static/uploads/7ec84261-9907-400c-ac09-9eca6c3dc7f4.jpg) \r\n\r\nThe children of Mincze and Mendel all took their mother’s (maiden) name of Kessler and David’s wedding and nationalization certificates reference only his mother not his father.  It was not uncommon at the time for children to take their mother’s surname, and formal civil marriage was often delayed even after birth of children since in Jewish communities the religious marriage not the civil one was the really important one. \r\n\r\n[David moved to Vienna](#5f716890c45e1e7223f4a1ac) when he was 15 years old in 1904.  He became apprenticed in knitwear manufacturing.  Conjecture is that his older sisters moved to Vienna about this time too, if not a few years before, and his parents moved with him.  Given his father’s death when he was only 15 years old, his brothers in law must have acted as surrogate fathers since they were 24 years older than him.  \r\n\r\nAdolph Nussenblatt had a shop in Vienna selling knitwear and his wife Mina and her sister Pauline Barber worked there. Adolph decided to setup a factory manufacturing his own products and advertised for a factory manager and David Kessler applied. They went into partnership naming their enterprise Enka (based on the initials for Nussenblatt and Kessler). David met Pauline and they became betrothed.\r\n\r\nAs a young man David played football for the amateur side-team of a professional club in Vienna.  His  wedding to Pauline was delayed because of the outbreak of WWI - they eventually married 5 July 1919.  David served in the Austrian-Hungarian Army.  He told his grandson, Tony, that he fought in the front lines on the Italian front throwing hand grenades into enemy trenches and that the Jewish soldiers had to bake their tefilin in an oven to get rid of the lice.  (Tefilin are small boxes with portions of scripture inside that religious Jewish men strap onto their heads and right arm for the Shachrit (morning) prayers during weekdays.) He told his daughter, Edith, that in the army he suffered from frostbite in his toes since the soles of his boots were made only of some sort of reinforced cardboard.\r\n\r\nDavid and Adolph went on to become quite prosperous in Vienna, but David lost everything during the Great Depression and then the Nazi regime.  See [Kessler family Vienna notes](#5f716890c45e1e7223f4a1ac) for details.',
            comments: [
              {
                user: '5f78faa4a031de2e33c69578',
                photos: [],
                body: 'Cool',
              },
              {
                user: '5f78faa4a031de2e33c69578',
                photos: [],
                body: 'So you can hyperlink between these?',
              },
              {
                user: '5f4c0aaf50cd630e33c20bc8',
                photos: [],
                body:
                  "Yeah... you need to use [markdown](https://www.markdownguide.org/basic-syntax#links) and link to hash tag of the other post, which you can see in the URL.  I'll make it easier at some point where you can simply type the # sign and a list of other posts will appear for you to pick from.",
              },
            ],
            zoom: 9,
          },
          subscribers: ['5f4c0aaf50cd630e33c20bc8'],
        },
        {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: ['19.22138571739197', '50.0382408238971'],
          },
          user: '5f4c0aaf50cd630e33c20bc8',
          properties: {
            title: 'The Barbers of Oświęcim',
            address:
              'Rynek Główny, Rynek Główny, Oświęcim, Lesser Poland Voivodeship 32-600, Poland',
            photos: [
              {
                filename: '519c5250-1933-4649-9a8e-2554f8297ff4.jpg',
                mimetype: 'image/png',
                encoding: '7bit',
                size: 2669492,
              },
              {
                filename: '6d6da93a-5259-4266-a874-ca2e3dd7819b.jpg',
                mimetype: 'image/jpeg',
                encoding: '7bit',
                size: 128770,
              },
            ],
            body:
              "Oświęcim is the town the Germans called Auschwitz and the Jews Oshpitsin.  Before WWII the population was 14,000 of which 50% were Jews.  Today in Poland, but before WWI was in the western portion of Galicia in the Austro-Hungarian Empire.\r\n\r\n## Bernard (Dov Berish) Barber\r\nBorn circa 1859 in Oświęcim (Auschwitz).\r\n- Son of Anselm and Mina Barber.  \r\n- Father of Pauline Barber\r\n- Husband of Toni Barber\r\n\r\nDov Berish owned a grocery store / deli and lived in the Ringplatz neighborhood.  According to his grand-daughter Edith, he was an authority on the Mishna and his advice would often be solicited to settle domestic issues between members of the Jewish community.  A document exhibited in the Oświęcim Jewish Center, Bernard is referenced as ‘Secretary’ of a Jewish community civil association.  The Oshpitsin Yitzkor Sefer references Bernard Barber as the gabai of the Great Synagogue.  Bernard is referenced in the 1891 Galicia Business Directory with profession Gemischtwaaren Handler (Grocery/Deli).  The [History of Jewish Oshpitzin and its Folktales](http://www.jewishgen.org/yizkor/oswiecim1/osw151.html) makes two references to Barber groceries on the main market square: ‘the old Barber house with grocery and delicatessen stores’, and Berish Barber’s 'extraordinarily well organized grocery store'.\r\n\r\nSince ‘Barber’ was a common surname in Oświęcim but not in other areas of Poland, there is a good possibility that ‘our’ Barbers went back some more generations\r\n\r\n## Toni (Taube) Barber\r\nBorn circa 1854 in Oświęcim.  Died 1934 in Oświęcim.\r\n- Daughter of Izaak/Yitzchak and Sara Fischer \r\n- Wife of Bernard Barber\r\n- Mother of Pauline Barber\r\n\r\n## Pauline Barber\r\nBorn 26 October 1886 in Oświęcim.  Died 1934 in Oświęcim.\r\n- Daughter of Bernard and Toni Barber\r\n- Wife of [David Kessler](#5f70f6eb1330074062b65ff6)\r\n- Mother of [Edith Horton](#5f716890c45e1e7223f4a1ac)\r\n\r\n![Pauline & David Kessler](/static/uploads/7ec84261-9907-400c-ac09-9eca6c3dc7f4.jpg)\r\nAdolph Nussenblatt married Pauline's sister, Mina Barber, and they moved to Vienna in about 1910. Adolph had a shop in Vienna selling knitwear and Mina and Pauline worked there.  Adolph decided to setup a factory manufacturing his own products and advertised for a factory manager and David Kessler applied.  They went into partnership naming their enterprise Enka (based on the initials for Nussenblatt and Kessler).  David met Pauline and they became betrothed.",
            comments: [],
            zoom: 9,
          },
        },
        {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: ['16.355214', '48.196472'],
          },
          user: '5f4c0aaf50cd630e33c20bc8',
          properties: {
            title: 'The Kesslers and Barbers in Vienna',
            address: 'Magdalenenstraße 2, 1060 Mariahilf, Austria',
            photos: [
              {
                filename: '0b2ff403-a0d4-4098-a37a-7c35ee8d5d72.jpg',
                mimetype: 'image/png',
                encoding: '7bit',
                size: 2386226,
              },
              {
                filename: '4884d139-26d3-4bcf-acb0-5ca05e50c279.jpg',
                mimetype: 'image/png',
                encoding: '7bit',
                size: 2682631,
              },
              {
                filename: 'b23bb402-d626-482a-b63d-89ebde50651a.jpg',
                mimetype: 'image/png',
                encoding: '7bit',
                size: 5835212,
              },
              {
                filename: 'fd9b865e-b7e7-45bb-9095-c9691f923b69.jpg',
                mimetype: 'image/png',
                encoding: '7bit',
                size: 4186106,
              },
              {
                filename: 'd3a03537-1d55-4c9c-9293-edad4a8c684c.jpg',
                mimetype: 'image/png',
                encoding: '7bit',
                size: 2715937,
              },
            ],
            body:
              "Mina Barber's husband, Adolph Nussenblatt had a shop in a suburb of Vienna near where Emperor Franz Joseph had a kept mistress.  Adolph would allow people, for a fee, to sit in his shop front window to watch as Franz Joseph left his mistress’s house early in the morning.  Adolph's shop sold knitwear and Mina and her sister [Pauline Barber](#5f7102476d7d696041b3e2bb) worked there.  \r\n\r\n[David Kessler](#5f70f6eb1330074062b65ff6) moved to Vienna when he was 15 years old, perhaps with his sisters and parents, in 1904.  \r\n\r\nAdolph got his big break in business when he obtained the contract to make leggings for the Austro-Hungarian Army just as WWI broke out.  He was subsequently called up to serve in the army, which would have disrupted his business breakthrough.  He found out where the army recruiting officer lived and one night placed a ladder under the man’s bedroom window and climbed up with a significant quantity of cash.  He knocked on the window to wake the man up and successfully completed the transaction absolving him from military service and ensuring his fortune. \r\n\r\nAdolph decided to setup a factory manufacturing his own products and advertised for a factory manager and David Kessler applied. They went into partnership naming their enterprise Enka (based on the initials for Nussenblatt and Kessler). David met Pauline and they became betrothed.  In 1920, the birthed a daughter, Edith.\r\n\r\n## Edith Horton\r\nBorn Edith Kessler, 13 April 1920 in Vienna.  Died 14 October 2019 in St. Albans, UK.\r\n- Daughter of [Pauline](#5f7102476d7d696041b3e2bb) and [David Kessler](#5f70f6eb1330074062b65ff6)\r\n- Wife of Alwyn James Ryan, Joseph Bloomberg, Hans Horton\r\n- Mother of Anthony Paul Bloomberg\r\n\r\nAt the time of her birth, Edith's father, David Kessler, was a prosperous factory owner and they lived in great style.  She related that their apartment was beautiful even though it was in the working class 16th Ottakring District where people spoke a patois (after WWI there was a shortage of housing in central Vienna).  \r\n\r\nBesides their flat in Vienna they had a villa in Baden where they would go to \"take the waters\".  They had a cook, a housekeeper and a ‘French Mademoiselle’ who was Edith's nanny.  Edith attended a French speaking kindergarten for a while.  She remembers, and photos confirm, that she was always very well dressed.  She was an only child and her parents doted on her.\r\n\r\n### The Great Depression\r\nAround the late 1920s, there was a falling out between Adolph and David; the reason for this dispute is a mystery.  They split up with Adolph keeping Enka, and David receiving some sort of cash settlement and maybe some machinery.  When Edith was about 10 years old, David was planning to set up his own textile manufacturing company, when the great crash of 1929 occurred and his cash holding became practically worthless.   A Czech manufacturer bought him out and gave him the job as a Director of the Austrian side of the business.  David lost his factory and wealth and the family circumstances were much reduced, though Edith did not recall any hardship.  They lost their villa in Baden and had to let go their house staff.  Edith recalled that every morning her mother humiliatingly had to ask David for household money, and yet David would spend his evenings in a cafe gambling.  Her mother would often ask Edith to go to the cafe to collect David to come home for evening meals. In contrast, Adolph Nussenblatt did not believe in keeping his profits in banks and preferred to buy property and other valuables so when the great crash of 1929 and subsequent depression arrived he did not lose his wealth.\r\n\r\nAt 14, under pressure from her father to learn a trade, Edith enrolled in the Schneideracadamie. She learned dressmaking, some related academic subjects, and art and design.  On graduation she started working in a dressmaking workshop towards the end of 1937.\r\n\r\n### The Anschluss\r\nEdith was a month short of her 18th birthday when the Germans took over Austria in March 1938, an event referred to as the Anschluss. The Austrian Nazis were ready with lists of Jews in each neighbourhood and after Kristallnacht 10 Nov 1938 they came into the family flat in Vienna whilst David was indisposed in bed, took him away, and expelled Edith and Pauline, taking away the keys to their flat; they slept the first night in the cellar of their apartment building.  Since Adolph Nussenblatt owned the apartment building where he lived, and since the Austrian Nazi who came to evict him happened to be his employee, he was able to stay in his apartment; Edith and Pauline moved in with them.  \r\n\r\nEdith found out that David had been taken to a convent – the nuns were relocated and the three floors of the convent held Jewish men taken from their homes.  She brought clothes and food for David and left him a note that she and Pauline were with Adolph and Mina Nussenblatt.  The Jews in the lower two floors were deported to Dachau Concentration Camp but the transports to Dachau from that convent were mysteriously halted and David, who was on the 3rd floor, was free to leave.  He came to the flat of Adolph and Aunt Mina with visible signs of having been beaten up.  This was the cause of reconciliation between David and Uncle Adolph after their rift of about 15 years.  \r\n\r\nEdith went to the office of the local Nazi Gauleiter on the top floor of a building with a spiral staircase to recover the keys to their flat.  In front of her, intent on a similar mission, was a Jewish girl a few years older than her – slightly hunchbacked; the Nazis picked her up and threw her down the well of the spiral staircase in front of Edith's eyes.  She was next in line but received back the keys to their flat without any problem.\r\n\r\nAfter Kristallnacht, Edith was was dismissed - because she was Jewish - from the couture establishment where she had worked.  Like most Jews, she spent a lot of time trying to obtain the necessary documentation for her parents and herself to emigrate. She put an advertisement in the Daily Telegraph newspaper in the UK offering her services as a dressmaker and a Hilda Winn in Romford Essex responded saying she could obtain a domestic work permit only - not exit or entry visas - but would help to find dressmaking employment once Edith settled in England.  Still she was unable to obtain a British visa.\r\n\r\n### A chance encounter\r\nOne day she was walking with some Jewish friends in the 6th District where she lived and near the ‘Opollo Cinema‘ she saw a group of elderly Jews, supervised by a uniformed SA man, put to work on hands and knees cleaning the steps of a public hall.  Edith and her friends offered to relieve the elderly Jews of this task and the SA man agreed and the elderly Jews were dismissed.  After she had finished with this task and was leaving the hall, one of the elderly Jewish men was waiting for her and thanked her.  He asked what her plans were and she explained that she had a British work permit but no visa but that she spoke English well.  The man told her to come to the West Bahnhof rail station in 2 days where he would arrange for her to obtain a British Visa and accompany a kindertransport to Britain.  Thus Edith left with a kindertransport on 7 Mar 1939 traveling to Hook of Holland from where the group took a boat to Harwich arriving 15 Mar 1939.  She was met at Liverpool Street Station London by Hilda Winn who took her to Romford Essex.",
            comments: [],
            zoom: 13,
          },
        },
      ],
      contributors: ['5f4c0aaf50cd630e33c20bc8', '5f5f7252efa0fc78aeb28999'],
      forks: [],
      limitContributors: true,
      title: 'family genealogy',
      subscribers: [],
    }

    // try to save this
    const obj = new FeatureCollection(data)
    await obj.save()
    res.json({ done: 'good' })
  })

  router.get(
    '/map/remove/:featureCollectionId',
    passportJWT,
    [param('featureCollectionId').not().isEmpty().trim()],
    async (req, res) => {
      try {
        // check for validation errors
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
          throw 'No map specified'
        }

        const featureCollectionId = req.params.featureCollectionId

        // remove this map from this user's list of maps
        await User.updateOne(
          {
            _id: req.user._id,
          },
          {
            $pull: { featureCollections: featureCollection._id },
          }
        )

        // console.log(`finding map ${featureCollectionId}...`)
        // find the map in question, assuming the user is in-fact a contributor
        let featureCollection = await FeatureCollection.findOne({
          publicId: featureCollectionId,
          contributors: req.user, // user must be a contributor in order to match
        })
        // console.log(`found map ${featureCollection._id}`)

        // remove this user from the map's list of contributors and subscribers
        featureCollection.contributors.pull(req.user)
        featureCollection.subscribers.pull(req.user)
        if (featureCollection.contributors.length == 0) {
          // console.log(`no more contributors`)
          // if there are no more contributors to the map, delete it completely
          await FeatureCollection.deleteOne({
            _id: featureCollection._id,
          })
        } else {
          // console.log(`other contributors exist`)
          // remove this user from the map, but keep the map for other users
          featureCollection = await featureCollection.save()
          // console.log('saved map without this user')
        }

        // all worked well... tell the client
        res.json({
          status: true,
          message: 'success',
        })
      } catch (err) {
        // for all errors...
        console.log(`Error: ${err}`)
        return res.status(500).json({
          status: false,
          message: err,
          error: err,
        })
      }
    }
  )

  // route to change collaboration settings
  router.post(
    '/map/collaboration',
    passportJWT,
    upload.none(),
    [
      body('add_collaborators').trim().escape(),
      body('featureCollectionId').not().isEmpty().trim(),
    ],
    async (req, res) => {
      // the map to adjust
      const featureCollectionId = req.body.featureCollectionId

      // check for validation errors
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Invalid input',
        })
      }

      // verify that this user has editor permissions
      let featureCollection = FeatureCollection.findOne({
        publicId: featureCollectionId,
        $or: [{ limitContributors: false }, { contributors: req.user }],
      })
      if (!featureCollection)
        throw 'You do not have permission to modify collaboration settings'

      // console.log(JSON.stringify(req.body, null, 2))

      // extract any new collaborators
      let newContributorEmails = req.body.add_collaborators.split(',')
      let nonUserContributorEmails = [...newContributorEmails] // assume none are users right now
      // clean up user lists... some kind of bug where the array has a blank string if none specified
      if (
        nonUserContributorEmails.length == 1 &&
        nonUserContributorEmails[0] == ''
      ) {
        // make it a proper blank string
        nonUserContributorEmails = []
      }
      if (newContributorEmails.length == 1 && newContributorEmails[0] == '') {
        // make it a proper blank string
        newContributorEmails = []
      }

      const newContributors = []
      // match emails to ids for any new collaborators
      await User.find(
        {
          email: {
            $in: newContributorEmails,
          },
        },
        (err, docs) => {
          docs.map((doc, i, arr) => {
            // all matching docs represent current users
            newContributors.push(doc) // add id of this user to list of contributors
            // remove this user from list of non-user email addresses
            nonUserContributorEmails.splice(
              nonUserContributorEmails.indexOf(doc.email)
            )
          })
        }
      )

      // console.log(JSON.stringify(newContributors, null, 2))

      // console.log(`non-users are: ${nonUserContributorEmails}`)

      // prepare the map updates
      // console.log(`adding: ${newContributorIds}`)
      const updates = {
        limitContributors:
          req.body.limit_contributors == 'private' ? true : false,
        // limitViewers:
        //   req.body.limit_viewers == 'private' ? true : false,
        // $addToSet: {
        //   $each: {
        //     contributors: newContributors,
        //   },
        // },
      }

      // make the damn map updates
      featureCollection = await FeatureCollection.findOneAndUpdate(
        { publicId: req.body.featureCollectionId },
        updates,
        { new: true } // return updated document
      ).catch((err) => {
        return res.status(500).json({
          status: false,
          message:
            'Sorry... something bad happened on our end!  Please try again.',
          error: 'Sorry... something bad happened on our end!  ',
        })
      })

      // add each new contributor
      newContributors.map((contributor, i, arr) => {
        featureCollection.contributors.addToSet(contributor)
      })

      // save changes
      await featureCollection.save((err, doc) => {
        if (err) {
          console.log(`Error: ${err}`)
          return res.status(500).json({
            status: false,
            message:
              'Sorry... something bad happened on our end!  Please try again.',
            error: 'Sorry... something bad happened on our end!  ',
          })
        } else {
          console.log('updated map')
        }
      })

      // console.log(JSON.stringify(map, null, 2))

      // send out notification emails to all collaboratorss
      const emailService = new EmailService({})
      newContributorEmails.map((email, i, arr) => {
        // send a welcome email
        const featureCollectionTitle = featureCollection.title
          ? featureCollection.title
          : 'anonymous map'
        const mapLink = `https://wikistreets.io/map/${featureCollection.publicId}`
        emailService.send(
          email,
          `Invitation to collaborate on '${featureCollectionTitle}'!`,
          `You have been cordially invited by ${req.user.handle} to collaborate on '${featureCollectionTitle}'!\n\nTo get started, visit ${mapLink}!`
        )
      })

      // remember invitations sent out to non-users so we can give them permission once they sign up
      nonUserContributorEmails.map((email, i, arr) => {
        // console.log(
        //   `inviter: ${req.user._id}; invitee: ${email}; map: ${featureCollection.publicId}`
        // )
        const invitation = new Invitation({
          inviter: req.user,
          invitee: email,
          featureCollection: featureCollection,
        })
        invitation.save()
      })

      res.json({
        status: true,
        message: 'success',
      })
    }
  )

  // route to fork a map
  router.get(
    '/map/fork/:featureCollectionId',
    passportJWT,
    [param('featureCollectionId').not().isEmpty().trim()],
    async (req, res) => {
      // retrieve the map to be forked
      const featureCollectionId = req.params.featureCollectionId
      const featureCollection = await FeatureCollection.findOne({
        publicId: featureCollectionId,
      }).exec((err, featureCollection) => {
        if (err) {
          // failure
          console.log(`FAILED TO FIND MAP: ${featureCollection}`)
          return res.status(400).json({
            status: false,
            message: 'Invalid map identifier',
            error: err,
          })
        }

        // create a new map object
        const newFeatureCollection = featureCollection.toObject()
        delete newFeatureCollection._id // remove old id
        newFeatureCollection.isNew = true // flag it as new
        newFeatureCollection.publicId = uuidv4() // generate a new random-ish public id for this map
        newFeatureCollection.contributors = [req.user] // wipe out list of contributors, save for this user
        newFeatureCollection.subscribers = [req.user] // wipe out list of contributors, save for this user
        newFeatureCollection.forks = [] // wipe out list of forks
        newFeatureCollection.forkedFrom = featureCollection._id // track from whence this fork came
        const fork = new FeatureCollection(newFeatureCollection)

        // save it
        fork.save((err, featureCollection) => {
          if (err) {
            // failure
            console.log(`FAILED TO FORK MAP: ${featureCollection}`)
            return res.status(500).json({
              status: false,
              message:
                'Sorry... something bad happened on our end!  Please try again.',
              error: err,
            })
          } else {
            // success
            console.log(`FORKED MAP: ${featureCollection._id}`)
            return res.json(featureCollection)
          }
        })

        // add this fork to the user's list of maps
        req.user.featureCollections.push(fork) // append to list
        req.user.save() // save changes

        // update original map's list of forks
        featureCollection.forks.push(fork) // re-append to list
        featureCollection.save() // save changes
      })
    }
  )

  // route for HTTP GET requests to the map JSON data
  router.get(
    '/map/data/:featureCollectionId',
    [param('featureCollectionId').not().isEmpty()],
    async (req, res) => {
      const featureCollectionId = req.params.featureCollectionId
      const sinceDate = req.query.since // optional param to retrieve only features since a given date
      let featureCollection = await FeatureCollection.findOne({
        publicId: featureCollectionId,
        sinceDate: sinceDate,
      })
        .populate('contributors', ['_id', 'handle'])
        .populate('forkedFrom', ['title', 'publicId'])
        .populate('features.user', ['_id', 'handle'])
        .populate('features.properties.comments.user', ['_id', 'handle'])
        .catch((err) => {
          return res.status(500).json({
            status: false,
            message:
              'Sorry... something bad happened on our end!  Please try again.',
            error: 'Sorry... something bad happened on our end!  ',
          })
        })
      // console.log(JSON.stringify(featureCollection, null, 2))

      if (featureCollection) {
        // tack on the bounding box, as long as there are markers
        if (featureCollection.features.length) {
          // for some reason we need to make a JSON object with none of the mongoose nonsense for buffering to work
          const simpleObject = JSON.parse(
            JSON.stringify(featureCollection, null, 2)
          )
          const buffered = turf.buffer(
            simpleObject,
            config.map.boundingBoxBuffer,
            {
              units: 'kilometers',
            }
          ) // buffer around the points
          featureCollection.bbox = turf.bbox(buffered)
        }
      } else {
        // there is no featureCollection... make a starter object
        featureCollection = {
          publicId: featureCollectionId,
          description: 'A blank starter map',
          features: [],
          bbox: [],
          saved: false, // not a real featureCollection
        }
      }

      // console.log(`MAP: ${map}`)
      res.json(featureCollection)
    }
  )

  // route for HTTP GET requests for a specific map
  router.get(
    '/map/:featureCollectionId',
    param('featureCollectionId').not().isEmpty().trim(),
    (req, res) => {
      res.sendFile(path.join(__dirname, '..', `/public/index.html`))
    }
  )

  // redirect requests for a home page to a map with a random identifier
  router.get(['/', '/map'], (req, res) => {
    const featureCollectionId = uuidv4() // randomish identifier
    // load map page anew with new id
    res.redirect(`/map/${featureCollectionId}`)
  })

  return router
}

module.exports = mapRouter
