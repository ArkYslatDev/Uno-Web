from flask import Flask, request, jsonify
import random

app = Flask(__name__)

def can_play(card, top_card, current_color):
    if card['value'] in ('wild', 'wild4'):
        return True
    if card['color'] == current_color:
        return True
    if card['value'] == top_card['value']:
        return True
    return False

@app.route('/decide', methods=['POST'])
def decide():
    data = request.json
    hand = data['hand']
    top_card = data['topCard']
    current_color = data['currentColor']
    next_player_hand_count = data.get('nextPlayerHandCount', 7)

    playable = [c for c in hand if can_play(c, top_card, current_color)]

    if not playable:
        return jsonify({'action': 'draw'})

    def score(card):
        s = 0
        if next_player_hand_count <= 1:
            if card['value'] == 'wild4': s += 100
            if card['value'] == 'draw2': s += 90
            if card['value'] == 'skip': s += 80
            if card['value'] == 'reverse': s += 70
        if card['color'] == current_color: s += 50
        if card['value'] in ('wild', 'wild4'): s -= 20
        if card['value'].isdigit(): s += 10
        return s

    best = max(playable, key=score)

    chosen_color = None
    if best['value'] in ('wild', 'wild4'):
        color_count = {}
        for c in hand:
            if c['color'] in ('red','yellow','green','blue'):
                color_count[c['color']] = color_count.get(c['color'], 0) + 1
        chosen_color = max(color_count, key=color_count.get) if color_count else random.choice(['red','yellow','green','blue'])

    return jsonify({'action': 'play', 'cardId': best['id'], 'chosenColor': chosen_color})

if __name__ == '__main__':
    app.run(port=5001)