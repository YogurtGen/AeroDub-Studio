import re
import unicodedata
from functools import lru_cache


@lru_cache(maxsize=1)
def japanese_engine():
    from pykakasi import kakasi
    from fugashi import Tagger
    return Tagger(), kakasi()


def reading_tokens(text, language):
    if language not in ('ja', 'ko', 'zh-CN'):
        language = 'ja' if re.search(r'[\u3040-\u30ff]', text) else 'ko' if re.search(r'[\uac00-\ud7af]', text) else 'zh-CN'
    tokens = []
    if language == 'ja':
        tagger, converter = japanese_engine()
        offset = 0
        for word in tagger(text):
            start = text.find(word.surface, offset)
            if start > offset:
                tokens.append((text[offset:start], offset, start))
            end = start + len(word.surface)
            pronunciation = word.feature.pron if re.search(r'[\u3040-\u30ff\u3400-\u9fff]', word.surface) else None
            roman = ''.join(item['hepburn'] for item in converter.convert(pronunciation or word.surface))
            tokens.append((roman, start, end))
            offset = end
        if offset < len(text):
            tokens.append((text[offset:], offset, len(text)))
    else:
        pattern = r'[\uac00-\ud7af]+' if language == 'ko' else r'[\u3400-\u9fff]+'
        offset = 0
        for match in re.finditer(pattern, text):
            if match.start() > offset:
                tokens.append((text[offset:match.start()], offset, match.start()))
            if language == 'ko':
                from korean_romanizer.romanizer import Romanizer
                tokens.append((Romanizer(match.group()).romanize(), match.start(), match.end()))
            else:
                from pypinyin import Style, lazy_pinyin
                for index, syllable in enumerate(lazy_pinyin(match.group(), style=Style.TONE, v_to_u=True)):
                    tokens.append((syllable, match.start() + index, match.start() + index + 1))
            offset = match.end()
        if offset < len(text):
            tokens.append((text[offset:], offset, len(text)))
    return tokens, language


def romanize_line(line, language):
    text = unicodedata.normalize('NFC', line['text'])
    tokens, actual_language = reading_tokens(text, language)
    source_words = line.get('words', [])
    joined = ''.join(word['text'] for word in source_words)
    ranges = []
    if joined.strip() == text.strip():
        offset = -(len(joined) - len(joined.lstrip()))
        for word in source_words:
            end = offset + len(word['text'])
            if end > offset:
                ranges.append((offset, end, word['start'], word['end']))
            offset = end
    words = []
    for token, start, end in tokens:
        if not token:
            continue
        if words and words[-1]['text'][-1:].isalnum() and token[:1].isalnum():
            token = ' ' + token
        overlaps = [(a, b, c, d) for a, b, c, d in ranges if a < end and b > start]
        if overlaps:
            a, b, c, d = overlaps[0]
            begins = c + max(0, start - a) / (b - a) * (d - c)
            a, b, c, d = overlaps[-1]
            finishes = c + min(b - a, end - a) / (b - a) * (d - c)
        else:
            begins, finishes = line['start'], line['end']
        words.append({'text': token, 'start': max(line['start'], begins), 'end': min(line['end'], max(begins, finishes))})
    return {'text': ''.join(word['text'] for word in words).strip(), 'words': words, 'sourceText': line['text'], 'language': actual_language, 'manual': False}


def romanize_document(document, language):
    return [{'id': line['id'], 'reading': romanize_line(line, language)} for line in document['segments']]
