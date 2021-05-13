from flask import Flask, render_template, Response, session
import json
import os
from os.path import join, dirname
from flask.json import jsonify
from flask.wrappers import Request, Response
from ibm_watson import SpeechToTextV1
from ibm_watson import TextToSpeechV1
from ibm_watson import AssistantV2
from ibm_cloud_sdk_core.authenticators import IAMAuthenticator
from flask import request, redirect
from dotenv import load_dotenv

app = Flask(__name__)
app.secret_key ='hbfescbbfwane<a'

@app.route("/")
def principal ():
       return render_template('UI.html')

@app.route('/api/session')
def sesisonWatson():
       assistant.set_service_url(os.environ.get('ASSISTANT_URL'))
       response = assistant.create_session(assistant_id=os.environ.get('ASSISTANT_ID')).get_result()
       print(json.dumps(response, indent=2))
       session['sessionID'] = response['session_id']
       print(session.get('sessionID'))
       return response['session_id']
       
@app.route('/api/speech-to-text', methods=['POST'])
def getTextFromSpeech():
       authenticator = IAMAuthenticator(os.environ.get('SPEECH_TO_TEXT_APIKEY'))
       speech_to_text = SpeechToTextV1(authenticator=authenticator)
       speech_to_text.set_service_url(os.environ.get('SPEECH_TO_TEXT_URL'))
       speech_recognition_results = speech_to_text.recognize(
              audio= request.get_data(cache=False),
              content_type='audio/wav',
              word_alternatives_threshold=0.9,
              keywords=['pepperoni', 'salami', 'pizza', 'cheese', 'sausage', 'vegetarian'],
              keywords_threshold=0.5
       ).get_result()
       if len(speech_recognition_results['results']) < 1:
              return Response(mimetype='plain/text', response="Sorry, didn't get that. please try again!")

       results =  speech_recognition_results['results'][0]['alternatives'][0]['transcript'].strip()
       print(json.dumps(speech_recognition_results['results'][0]['alternatives'][0]['transcript'], indent=2))
       

       return Response(response=results, mimetype='text/plain')

@app.route('/api/watson-assistant', methods=['POST', 'GET'])
def getResponseFromWatson():

       response = assistant.message(
              assistant_id= os.environ.get('ASSISTANT_ID'),
              session_id = session.get('sessionID'),
              input={
                     'message_type': 'text',
                     'text': request.get_data(as_text=True)
              }
       ).get_result()
       if len(response['output']['generic'])> 1:
              text = response['output']['generic'][0]['text'] +  response['output']['generic'][1]['text']
              return Response(response=text, mimetype='text/plain')

       text = response['output']['generic'][0]['text']
       print(json.dumps(response['output']['generic'], indent=2))
       return Response(response=text, mimetype='text/plain')
       
@app.route('/api/text-to-speech', methods=['POST'])
def getSpeechFromText():
       authenticator = IAMAuthenticator(os.environ.get('TEXT_TO_SPEECH_APIKEY'))
       text_to_speech = TextToSpeechV1(
              authenticator=authenticator
       )
       text_to_speech.set_service_url(os.environ.get('TEXT_TO_SPEECH_URL'))
       result = text_to_speech.synthesize(
              request.get_data(as_text=True),
              voice='en-US_AllisonV3Voice',
              accept='audio/wav'
              ).get_result().content
       print(type(result))
       return Response(response=result , mimetype='audio/x-wav')

if __name__ == '__main__':
       load_dotenv()
       authenticator = IAMAuthenticator(os.environ.get('ASSISTANT_APIKEY'))
       assistant = AssistantV2(version='2021-05-12',authenticator = authenticator)
       app.run(debug=True, port=8000)

