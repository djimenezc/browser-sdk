'use strict';

require('should');

const {nthIndex, getAllPosition, numberOccurrences, regexIndexOf} =
  require('../../lib/parser/parserUtils.js');

const jsonString =
  '[1530523712598,"INFO","","","unknown","","10.125.12.113",47480,"10.120.135.15",8080,"GET","https://10.120.135.15/generic/text.json","{q:error.not_valid_empty}","null","ELB-HealthChecker/1.0","en_US",0,52,7,"OK",null,null,null,null,null],[1530523712919,"INFO","ssancho","ba54e58c-8b60-4306-97d8-13748bf14168","samuel.sancho@devo.com","91D5C66551170E98B8F13941D64FD137","213.4.16.46",46854,"eu.devo.com",8080,"POST","https://eu.devo.com/search/preferences.json","{configuration:{\\"widgets\\":{\\"list\\":[{\\"clazz\\":\\"AWCustomDate\\",\\"cols\\":[[\\"FechaPrueba\\"],[\\"Speed\\"],[\\"CO2(g/km)_F\\"],[\\"l/100_F\\"],[]],\\"rect\\":{\\"l\\":75,\\"t\\":96,\\"w\\":1741,\\"h\\":500}}],\\"desktop\\":{\\"R\\":1856,\\"B\\":938,\\"T\\":5,\\"L\\":75}}},mid:1530521128140,sid:1}","https://eu.devo.com/welcome","Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.99 Safari/537.36","en_US",415,52,19,"OK","ES","29","Madrid","Telefonica de Espana Static IP","Telefonica de Espana Static IP"],[1530523712964,"INFO","","","unknown","","172.17.0.72",52376,"172.17.1.183",8080,"GET","https://172.17.1.183/generic/text.json","{q:error.not_valid_empty}","null","ELB-HealthChecker/2.0","en_US",0,52,17,"OK",null,null,null,null,null],[1530523712965,"INFO","","","unknown","","172.17.0.72",52378,"172.17.1.183",8080,"GET","https://172.17.1.183/generic/text.json","{q:error.not_valid_empty}","null","ELB-HealthChecker/2.0","en_US",0,52,17,"OK",null,null,null,null,null],[1530523713196,"INFO","iberia@gonet","335abd37-75da-424e-bcec-f4582c15d8ec","alberto.amores@gonetfpi.com","F7C68598A60585325C79D6EEA300E950","46.24.48.2",46870,"gonet.logtrust.com",8080,"GET","https://gonet.logtrust.com/alerts/alertsGlobe.json","{origin:menu.search,}","https://gonet.logtrust.com/welcome","Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.99 Safari/537.36","es_ES",0,121,6,"OK","ES","29","Tres Cantos","Vodafone Spain","Vodafone Spain"]';


describe('Parser utils', () => {

  describe('numberOccurrences', () => {

    it('get number of occurrences of character pattern', () => {
      const str = 'XYZ 123 ABC 456 ABC 789 ABC';

      const occurrences = numberOccurrences(str, 'ABC');

      occurrences.should.be.equal(3);
    });
    it('get number of occurrences of character pattern', () => {

      const occurrences = numberOccurrences(jsonString, '],[');

      occurrences.should.be.equal(8);
    });
  });

  describe('getPositions', () => {

    it('get occurrences of character pattern', () => {
      const str = 'XYZ 123 ABC 456 ABC 789 ABC';

      const position = getAllPosition(str, 'ABC');

      position.should.be.eql([8, 16, 24]);
    });
  });

  describe('regexIndexOf', () => {


    it('should find the position of simple pattern', () => {
      const str = '[1562754170000,"POST",47]  ,    [1562754180000,null,2]';
      const position = regexIndexOf(str, ']\\s*,\\s*\\[', 0);

      position.should.be.eql(24);
    });

    it('should find the position of simple brackets pattern with no blanks', () => {
      const str = '[1562754170000,"POST",47],[1562754180000,null,2]';

      const position = regexIndexOf(str, /]\s*,\s*\[/, 0);

      position.should.be.eql(24);
    });
  });

  describe('getPosition', () => {

    it('get third occurrence of character pattern', () => {
      const str = 'XYZ 123 ABC 456 ABC 789 ABC';

      const position = nthIndex(str, 'ABC', 3);

      position.should.be.equal(24);
    });

    it('get first occurrence of a array separator', () => {
      const position = nthIndex(jsonString, '],[', 1);
      position.should.be.equal(235);
    });

    it('get second occurrence of a array separator', () => {
      const position = nthIndex(jsonString, '],[', 2);
      position.should.be.equal(554);
    });

    it('get second occurrence of a array separator, short string', () => {
      const position = nthIndex(
        '"{configuration:{\\"widgets\\":{\\"list\\":[{\\"clazz\\":\\"AWCustomDate\\",\\"cols\\":[[\\"FechaPrueba\\"],[\\"Speed\\"],[',
        '],[', 2);
      position.should.be.equal(106);
    });

  });
});


