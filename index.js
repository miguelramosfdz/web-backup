#!/usr/bin/env node
// web-backup - Make a local copy of your online website - Copyright (C) 2015 by yieme - All Rights Reserved - License: MIT

;(function() {
  'use strict';


  var convar  = require('convar')
    , S       = require('string')
    , getUrl  = convar('url', 'usage: web-backup --url <domain> [--max <connections>] [--dir <output directory]')
    , domain  = getUrl.replace('http://', '').replace('https://', '')
    , outPath = convar('dir') || process.cwd() + '/' + domain + '/'
    , maxQ    = convar('max') || 1
    , crawled = []
    , todo    = []
    , pages   = 0
    , fs      = require('fs')
    , Crawler = require("crawler") // walk the site
    , scraper = require('website-scraper') // scrape the resources
    , scrape  = function(uri) {
        var options = {
          urls: [uri],
          directory: outPath + uri.replace(getUrl, ''),
          subdirectories: [
            {directory: 'img', extensions: ['.jpg', '.png', '.svg']},
            {directory: 'js', extensions: ['.js']},
            {directory: 'css', extensions: ['.css']}
          ],
          sources: [
            {selector: 'img', attr: 'src'},
            {selector: 'link[rel="stylesheet"]', attr: 'href'},
            {selector: 'script', attr: 'src'}
          ]
        };

        if (!fs.existsSync(options.directory)) {
          scraper.scrape(options).then(function (result) {
            console.log(pages, 'of', crawled.length, 'scraped:', uri);
//            var json = JSON.stringify(result)
//            console.log(json)
            var filename = result[0].filename;
            var html = fs.readFileSync(filename, 'utf8')
            html = S(html).replaceAll(getUrl, '/').s
            fs.writeFileSync(filename, html, 'utf8')
            setTimeout(scrapePage, 10)
          });
        } else {
          console.log('dup dir:', options.directory, 'uri:', uri)
          setTimeout(scrapePage, 10)
        }
      }
    , crawl       = new Crawler({
        maxConnections : maxQ,
        // This will be called for each crawled page
        callback : function (error, result, $) { // $ is Cheerio by default, a lean implementation of core jQuery designed specifically for the server
          if (error) {
            console.log('ERROR:', error)
          } else if (!$) {
//            var filename = result.url.replace(getUrl, '')
//            console.log('!$', filename)
//            var path = filename.split('/').pop().join('/')
//            console.log('mkdir:', path)
//            fs.mkdirSync(path)
//            fs.writeFileSync(filename, result.body)
          } else {
            var refs = $('a')
            if (refs) {
              refs.each(function(index, a) {
                if (a) {
                  var uri = $(a).attr('href');
                  if (uri && uri.substr(0, getUrl.length) == getUrl) {
                    uri = S(uri.split('#')[0]).replaceAll('://', '::/').s;
                    uri = S(uri).replaceAll('//', '/').s;
                    uri = S(uri).replaceAll('::/', '://').s;
                    uri = S(uri).trim().s;
                    if (crawled.indexOf(uri) < 0) {
                      processPage(uri);
                    }
                  }
                }
              })
            }
          }
        }
      })
    ;

  function scrapePage() {
    if (todo.length > 0) {
      var uri = todo.shift();
      pages++;
      scrape(uri);
    } else {
      process.exit(0)
    }
  }



  var processPage = function processPage(uri) {
    if (uri.substr(-4) != '.jpg' && uri.substr(-5) != '.jpeg' && uri.substr(-4) != '.gif' && uri.substr(-4) != '.png' && uri.substr(-4) != '.svg') {
      crawled.push(uri);
      crawl.queue(uri);
      console.log('crawl:', uri)
      todo.push(uri);
    }
  }


  // Queue just one URL, with default callback
  processPage(getUrl);
  setTimeout(scrapePage, 1000)

  var WebBackup = function() { // TODO: refactor so this can be used as library and not just CLI

  }



  if (typeof exports === 'object') module.exports = WebBackup // support CommonJS
  // else if (typeof define === 'function' && define.amd) define(function() { return WebBackup }) // support AMD
  // else this.WebBackup = WebBackup // support browser
})();
