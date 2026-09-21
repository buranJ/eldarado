# Письмо в Eldorado за документацией Seller API

Отправить с почты, на которую зарегистрирован аккаунт продавца.

**Кому:** api@eldorado.gg
**Тема:** Seller API documentation request

---

Hello,

I sell game accounts on Eldorado and would like to automate managing my offers
and orders through the Seller API.

Could you please send me the API documentation? I am specifically looking for:

1. Base URL and authentication (how the API key is passed in requests).
2. Endpoints for offers: create, update, pause, resume, delete.
3. Endpoints for orders: list, mark as delivered, cancel.
4. Rate limits and any sandbox or test environment, if one exists.
5. The exact field format for game account offers (Clash Royale in particular).

My seller account is registered to this email address.

Thank you,
[ваше имя]

---

## Зачем это нужно

Без документации точные эндпойнты неизвестны. Подбирать их вслепую на живом
аккаунте продавца рискованно: можно случайно создать настоящие объявления в
вашей витрине, упереться в лимиты или спровоцировать блокировку за подозрительную
активность.

Пока документации нет, публикация работает в ассистированном режиме: система
готовит полностью заполненный черновик объявления, вы вставляете его на Eldorado
руками. Адаптер публикации написан за общим интерфейсом, поэтому переход на API
будет заменой одного класса, а не переделкой.
