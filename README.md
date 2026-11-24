# IPSC Calendar – nowy frontend dla The Events Calendar

Wtyczka WordPress, która zastępuje widok kalendarza dla odwiedzających. Wydarzenia nadal
dodaje się i edytuje w **The Events Calendar** (TEC) — ta wtyczka zmienia tylko sposób
ich przeglądania.

## Funkcje

- **Widoki:** lista (grupowana po miesiącach) oraz siatka miesiąca z agendą dnia/miesiąca.
- **Wyszukiwarka** pełnotekstowa (nazwa, opis, miejsce, miasto, organizator, kategorie),
  odporna na polskie znaki („lodz” znajdzie „Łódź”).
- **Filtry fasetowe** z licznikami: tagi, kategoria, lokalizacja, miejscowość, miejsce,
  organizator oraz przełącznik „tylko wyróżnione”.
- **Lokalizacja** łączy województwo z adresu miejsca oraz kategorie TEC, które są
  województwami lub zaczynają się od „Zagranica” — te kategorie znikają z filtra „Kategoria”.
  Różne filtry zawsze się zawężają. W **kategoriach i tagach** każde zaznaczenie też zawęża
  (Level III + Strzelba = tylko zawody Level III w strzelbie); w lokalizacji, miejscowości,
  miejscu i organizatorze zaznaczenie kilku pozycji pokazuje wydarzenia z każdej z nich.
- **Termin:** nadchodzące, najbliższe 7 dni, ten miesiąc, najbliższe 3 miesiące, ten rok,
  minione, własny zakres.
- **Sortowanie:** data rosnąco/malejąco, nazwa A–Z / Z–A, ostatnio dodane.
- **Szczegóły wydarzenia** rozwijane w karcie (lista) lub w oknie (widok miesiąca):
  adres z linkiem do mapy, organizator, koszt, opis, „Kalendarz Google”, plik `.ics`.
- **PL / EN:** język wybierany automatycznie (Polylang / WPML / język witryny),
  z przełącznikiem w UI — wybór zapamiętywany w przeglądarce.
- **Subskrypcja całego kalendarza** (jak w oryginalnej wtyczce): Kalendarz Google, iCalendar,
  Outlook 365, Outlook Live, eksport pliku `.ics` oraz kopiowanie adresu kanału.
- **Linki z filtrami:** stan filtrów zapisywany w adresie (`?ic_cat=level-ii&ic_city=Łódź`),
  więc można je udostępniać.
- Responsywny (na telefonie panel filtrów jest wysuwany), dostępny z klawiatury,
  kolory konfigurowalne przez zmienne CSS.

## Instalacja

1. Skopiuj katalog `ipsc-calendar/` do `wp-content/plugins/`
   (albo spakuj go do ZIP-a i wgraj przez *Wtyczki → Dodaj nową*).
2. Włącz wtyczkę (wymaga aktywnej The Events Calendar, WordPress ≥ 6.5, PHP ≥ 7.4).
3. Wstaw shortcode na dowolną stronę:

```
[ipsc_calendar]
```

### Parametry shortcode

| Parametr      | Wartości                                                       | Domyślnie  |
|---------------|----------------------------------------------------------------|------------|
| `view`        | `list`, `month`                                                | `list`     |
| `period`      | `upcoming`, `next7`, `month`, `next3`, `year`, `past`          | `upcoming` |
| `lang`        | `auto`, `pl`, `en`                                             | `auto`     |
| `lang_switch` | `yes`, `no` — przełącznik PL/EN w UI                           | `yes`      |
| `per_page`    | 5–100 — liczba wydarzeń przed przyciskiem „Pokaż więcej”        | `20`       |
| `categories`  | slugi kategorii TEC po przecinku — pokazuje **tylko** te        | (wszystkie)|
| `location_categories` | slugi kategorii traktowanych jako lokalizacja — wyłącza automatyczne wykrywanie | (auto) |
| `sync_url`    | `yes`, `no` — zapis filtrów w adresie strony                   | `yes`      |
| `subscribe`   | `yes`, `no` — przycisk „Subskrybuj kalendarz”                  | `yes`      |

Przykład: `[ipsc_calendar view="month" categories="level-ii,level-iii" lang="pl"]`

### Lokalizacja – automatyczne wykrywanie

Do filtra **Lokalizacja** trafiają kategorie, których nazwa to jedno z 16 województw
(także z przedrostkiem „woj.” / „województwo”) albo zaczyna się od „Zagranica”
(np. „Zagranica”, „Zagranica Strzelba”). Wielkość liter i polskie znaki nie mają znaczenia.
Jeśli chcesz sam wskazać takie kategorie, podaj ich slugi:

```
[ipsc_calendar location_categories="mazowieckie,slaskie,zagranica,zagranica-strzelba"]
```

### Subskrypcja kalendarza

Przycisk „Subskrybuj kalendarz” pod listą korzysta z tego samego kanału iCal co
The Events Calendar (`/?post_type=tribe_events&ical=1&eventDisplay=list`), więc subskrypcja
działa identycznie jak w oryginalnej wtyczce i zawiera **wszystkie** wydarzenia (filtry na stronie
nie wpływają na subskrypcję).

TEC domyślnie umieszcza w kanale tylko 30 najbliższych wydarzeń — ta wtyczka podnosi limit
do **200** (`Plugin::ICAL_FEED_LIMIT`). Inną wartość ustawisz filtrem:

```php
add_filter( 'ipsc_calendar_ical_feed_limit', function () {
	return 500;
} );
```

Kalendarze Google/Outlook odświeżają subskrypcje co kilka–kilkanaście godzin — nowe wydarzenia
nie pojawią się u subskrybentów natychmiast.

## Aktualizacja wtyczki

Dane (wydarzenia, kategorie, ustawienia TEC) nie są zapisywane we wtyczce, więc aktualizacja
ich nie dotyka. Strona z shortcode'em też zostaje bez zmian.

**Przez FTP**
1. (Zalecane) Pobierz z serwera kopię obecnego katalogu `wp-content/plugins/ipsc-calendar/`.
2. Wgraj nowy katalog `ipsc-calendar/` w to samo miejsce, **nadpisując** pliki.
   Jeśli w nowej wersji jakiś plik usunięto, najpewniej jest najpierw skasować stary
   katalog na serwerze, a potem wgrać nowy — wtyczka na chwilę zniknie z witryny.
3. Wejdź na stronę z kalendarzem i odśwież ją. Numer wersji widać w *Wtyczki*.

**Przez panel WordPressa**
1. *Wtyczki → Zainstalowane* → **Wyłącz**, potem **Usuń** „IPSC Calendar”
   (bezpieczne — wtyczka nie trzyma żadnych danych poza cache).
2. *Wtyczki → Dodaj nową → Wyślij wtyczkę na serwer* → wybierz nowy ZIP → **Włącz**.

Po aktualizacji:
- Każde wydanie ma nowy numer wersji (`Version` i `IPSC_CALENDAR_VERSION`
  w `ipsc-calendar.php`). Wszystkie pliki JS/CSS są ładowane z `?ver=…`, więc przeglądarki
  odwiedzających same pobiorą nowe wersje.
- Jeśli na stronie działa wtyczka cache (WP Rocket, LiteSpeed Cache, W3 Total Cache itp.)
  lub Cloudflare — **wyczyść ich cache**, bo mogą trzymać starą wersję strony.
- Coś poszło nie tak? Przez FTP zmień nazwę katalogu `ipsc-calendar` na `ipsc-calendar-off`
  (wtyczka się wyłączy) i wgraj z powrotem kopię z punktu 1.

## Wygląd

Wszystkie style są zawężone do `.ipsc-cal`. Kolory zmienisz w CSS motywu:

```css
.ipsc-cal {
	--ic-accent: #0b5cad;     /* kolor wiodący */
	--ic-featured: #b7791f;   /* wyróżnione wydarzenia */
	--ic-radius: 6px;
}
```

Kolory kategorii są generowane automatycznie ze sluga. Własne kolory ustawisz filtrem:

```php
add_filter( 'ipsc_calendar_category_color', function ( $color, $term ) {
	$map = array( 'level-i' => '#2e7d32', 'level-ii' => '#1565c0', 'level-iii' => '#b3261e' );
	return $map[ $term->slug ] ?? $color;
}, 10, 2 );
```

## Jak to działa

```
TEC (wprowadzanie danych)
   │  tribe_events() ORM – obsługuje też wystąpienia wydarzeń cyklicznych
   ▼
GET /wp-json/ipsc-calendar/v1/events?from=YYYY-MM-DD&to=YYYY-MM-DD
   │  zwarty JSON (wydarzenia + słowniki miejsc, organizatorów, kategorii, tagów)
   │  cache w transientach, czyszczony automatycznie po zapisaniu wydarzenia/miejsca/organizatora/kategorii
   ▼
Przeglądarka: filtrowanie, sortowanie i liczniki działają lokalnie → natychmiastowa reakcja UI
```

- Endpoint jest publiczny i tylko do odczytu; zwraca wyłącznie opublikowane wydarzenia
  i respektuje opcję TEC „Ukryj na listach wydarzeń”.
- Maksymalny zakres jednego zapytania: 800 dni, maks. 2000 wydarzeń.

### Filtry PHP (hooki)

| Hook                              | Do czego                                                    |
|-----------------------------------|-------------------------------------------------------------|
| `ipsc_calendar_config`            | zmiana konfiguracji przekazywanej do UI                     |
| `ipsc_calendar_event_repository`  | modyfikacja zapytania TEC (np. filtr języka)                |
| `ipsc_calendar_event`             | dodanie/zmiana pól pojedynczego wydarzenia                  |
| `ipsc_calendar_category_color`    | kolor kategorii                                             |
| `ipsc_calendar_excerpt_words`     | długość opisu (domyślnie 40 słów)                           |
| `ipsc_calendar_cache_ttl`         | czas życia cache w sekundach (domyślnie 3600)               |
| `ipsc_calendar_ical_feed_url`     | adres kanału iCal używany do subskrypcji                    |
| `ipsc_calendar_ical_feed_limit`   | liczba wydarzeń w kanale iCal (domyślnie 200)               |
| `ipsc_calendar_subscribe_links`   | linki subskrypcji (pusty tekst ukrywa pozycję w menu)       |

## Struktura projektu

```
ipsc-calendar/                 ← wtyczka (to trafia na serwer)
  ipsc-calendar.php            bootstrap
  includes/
    class-plugin.php           rejestracja komponentów
    class-event-repository.php pobieranie i mapowanie danych z TEC
    class-rest-controller.php  endpoint REST
    class-shortcode.php        [ipsc_calendar] + ładowanie zasobów
    class-subscribe-links.php  linki „Subskrybuj kalendarz"
    class-cache.php            wersjonowany cache
  assets/css/calendar.css
  assets/js/
    app.js                     główny moduł UI
    filters.js                 filtrowanie, fasety, sortowanie (czysta logika)
    state.js                   stan UI ⇄ adres URL
    date.js                    operacje na datach
    i18n.js                    tłumaczenia PL / EN
    api.js, dom.js
    components/event.js        karta i szczegóły wydarzenia
    views/list.js, views/month.js
dev/                           podgląd bez WordPressa (dane testowe)
tests/                         testy jednostkowe (node:test)
tests/support/                 mapowanie importów modułów dla Node
```

Frontend to czyste moduły ES — **bez kroku budowania**, bez zależności npm.
Moduły importują się po identyfikatorach (`ipsc-calendar/filters` itd.), które WordPress
zamienia na adresy z numerem wersji przez import map (`wp_register_script_module`).
Nowy plik JS trzeba dopisać do `Shortcode::MODULES` w `includes/class-shortcode.php`
oraz do import map w `dev/index.html`.

## Historia zmian

- **0.4.0** — Zaznaczanie kolejnych kategorii i tagów zawęża wyniki (wcześniej je sumowało).
- **0.3.1** — Kanał iCal (subskrypcja, eksport .ics) zawiera do 200 wydarzeń zamiast 30.
- **0.3.0** — Przycisk „Subskrybuj kalendarz” (Google, iCalendar, Outlook 365/Live, .ics,
  kopiowanie adresu). Nowy plik: `includes/class-subscribe-links.php`.
- **0.2.0** — Tagi pod terminem; filtr „Województwo” zastąpiony „Lokalizacją”
  (województwa i „Zagranica…” wyciągnięte z kategorii); lokalizacja na karcie wydarzenia
  bez miejsca; wersjonowanie wszystkich plików JS przy aktualizacji.
- **0.1.0** — Pierwsza wersja.

## Praca lokalna

```bash
npm run dev    # podgląd z danymi testowymi: http://localhost:5173/dev/
npm test       # testy jednostkowe logiki filtrów, dat, URL i tłumaczeń
```

W podglądzie `?devlang=en` wymusza język angielski.

## Dodawanie tłumaczeń / tekstów

Teksty UI są w `ipsc-calendar/assets/js/i18n.js` (słowniki `en` i `pl`). Test
`tests/state-date-i18n.test.js` pilnuje, żeby każdy klucz miał wersję polską.
Formy liczby mnogiej korzystają z `Intl.PluralRules` (`one` / `few` / `many` / `other`).
