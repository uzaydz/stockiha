ECOTRACK API
L'API Public ECOTRACK vous permet d'utiliser le service sans passer par l'interface web et vous donne la possibilité de lier votre compte avec votre CRM, Plateforme E-commerce ou autres applications.
Les fonctionnalités disponibles sont :
L'ajout de commande
La modification de commande
L'ajout et la récupération des mises a jours sur l’état de livraison
Demander le retour d'un colis
Suivre l'avancement de livraison d'un colis
GET
Liste des wilayas actives
{{url}}/api/v1/get/wilayas
Ce point de terminaison permet de récupérer la liste des wilayas livrable par la société de livraison.
Example Request
Liste des wilayas actives

curl
curl --location -g '{{url}}/api/v1/get/wilayas'
200 OK
Example Response
Body
Headers (12)
View More
json
[
  {
    "wilaya_id": 1,
    "wilaya_name": "Adrar"
  },
  {
    "wilaya_id": 2,
    "wilaya_name": "Chlef"
  },
  {
    "wilaya_id": 3,
    "wilaya_name": "Laghouat"
  },
  {
    "wilaya_id": 4,
    "wilaya_name": "Oum El Bouaghi"
  },
  {
    "wilaya_id": 5,
    "wilaya_name": "Batna"
  },
  {
    "wilaya_id": 6,
    "wilaya_name": "Béjaïa"
  },
  {
    "wilaya_id": 7,
    "wilaya_name": "Biskra"
  },
  {
    "wilaya_id": 8,
    "wilaya_name": "Béchar"
  },
  {
    "wilaya_id": 9,
    "wilaya_name": "Blida"
  },
  {
    "wilaya_id": 10,
    "wilaya_name": "Bouira"
  },
  {
    "wilaya_id": 11,
    "wilaya_name": "Tamanrasset"
  },
  {
    "wilaya_id": 13,
    "wilaya_name": "Tlemcen"
  },
  {
    "wilaya_id": 14,
    "wilaya_name": "Tiaret"
  },
  {
    "wilaya_id": 15,
    "wilaya_name": "Tizi Ouzou"
  },
  {
    "wilaya_id": 16,
    "wilaya_name": "Alger"
  },
  {
    "wilaya_id": 17,
    "wilaya_name": "Djelfa"
  },
  {
    "wilaya_id": 18,
    "wilaya_name": "Jijel"
  },
  {
    "wilaya_id": 19,
    "wilaya_name": "Sétif"
  },
  {
    "wilaya_id": 20,
    "wilaya_name": "Saïda"
  },
  {
    "wilaya_id": 21,
    "wilaya_name": "Skikda"
  },
  {
    "wilaya_id": 22,
    "wilaya_name": "Sidi Bel Abbès"
  },
  {
    "wilaya_id": 23,
    "wilaya_name": "Annaba"
  },
  {
    "wilaya_id": 24,
    "wilaya_name": "Guelma"
  },
  {
    "wilaya_id": 25,
    "wilaya_name": "Constantine"
  },
  {
    "wilaya_id": 26,
    "wilaya_name": "Médéa"
  },
  {
    "wilaya_id": 27,
    "wilaya_name": "Mostaganem"
  },
  {
    "wilaya_id": 28,
    "wilaya_name": "M'Sila"
  },
  {
    "wilaya_id": 29,
    "wilaya_name": "Mascara"
  },
  {
    "wilaya_id": 30,
    "wilaya_name": "Ouargla"
  },
  {
    "wilaya_id": 31,
    "wilaya_name": "Oran"
  },
  {
    "wilaya_id": 32,
    "wilaya_name": "El Bayadh"
  },
  {
    "wilaya_id": 33,
    "wilaya_name": "Illizi"
  },
  {
    "wilaya_id": 34,
    "wilaya_name": "Bordj Bou Arreridj"
  },
  {
    "wilaya_id": 35,
    "wilaya_name": "Boumerdès"
  },
  {
    "wilaya_id": 36,
    "wilaya_name": "El Tarf"
  },
  {
    "wilaya_id": 37,
    "wilaya_name": "Tindouf"
  },
  {
    "wilaya_id": 38,
    "wilaya_name": "Tissemsilt"
  },
  {
    "wilaya_id": 39,
    "wilaya_name": "El Oued"
  },
  {
    "wilaya_id": 40,
    "wilaya_name": "Khenchela"
  },
  {
    "wilaya_id": 41,
    "wilaya_name": "Souk Ahras"
  },
  {
    "wilaya_id": 42,
    "wilaya_name": "Tipaza"
  },
  {
    "wilaya_id": 43,
    "wilaya_name": "Mila"
  },
  {
    "wilaya_id": 44,
    "wilaya_name": "Aïn Defla"
  },
  {
    "wilaya_id": 45,
    "wilaya_name": "Naâma"
  },
  {
    "wilaya_id": 46,
    "wilaya_name": "Aïn Témouchent"
  },
  {
    "wilaya_id": 47,
    "wilaya_name": "Ghardaïa"
  },
  {
    "wilaya_id": 48,
    "wilaya_name": "Relizane"
  }
]
GET
Liste des communes actives
{{url}}/api/v1/get/communes?wilaya_id
Ce point de terminaison permet de récupérer la liste des communes livrable par la société de livraison.
AUTHORIZATION
Bearer Token
Token
<token>
PARAMS
wilaya_id
Optionnel | Entre 1 et 58
Example Request
Liste des communes actives

curl
curl --location -g '{{url}}/api/v1/get/communes'
200 OK
Example Response
Body
Headers (14)
View More
json
{
  "0": {
    "nom": "Abadla",
    "wilaya_id": 8,
    "code_postal": "817",
    "has_stop_desk": 0
  },
  "1": {
    "nom": "Abalessa",
    "wilaya_id": 11,
    "code_postal": "1102",
    "has_stop_desk": 0
  },
  "2": {
    "nom": "Abi Youcef",
    "wilaya_id": 15,
    "code_postal": "1531",
    "has_stop_desk": 0
  },
  "3": {
    "nom": "Abou El Hassan",
    "wilaya_id": 2,
    "code_postal": "222",
    "has_stop_desk": 0
  },
  "4": {
    "nom": "Achaacha",
    "wilaya_id": 27,
    "code_postal": "2717",
    "has_stop_desk": 0
  },
  "5": {
    "nom": "Adekar",
    "wilaya_id": 6,
    "code_postal": "624",
    "has_stop_desk": 0
  },
  "6": {
    "nom": "Adrar",
    "wilaya_id": 1,
    "code_postal": "101",
    "has_stop_desk": 0
  },
  "7": {
    "nom": "Afir",
    "wilaya_id": 35,
    "code_postal": "3503",
    "has_stop_desk": 0
  },
  "8": {
    "nom": "Aflou",
    "wilaya_id": 3,
    "code_postal": "319",
    "has_stop_desk": 0
  },
  "9": {
    "nom": "Aghbal",
    "wilaya_id": 42,
    "code_postal": "4207",
    "has_stop_desk": 0
  },
  "10": {
    "nom": "Aghbalou",
    "wilaya_id": 10,
    "code_postal": "1027",
    "has_stop_desk": 0
  },
  "11": {
    "nom": "Aghlal",
    "wilaya_id": 46,
    "code_postal": "4607",
    "has_stop_desk": 0
  },
  "12": {
    "nom": "Aghribs",
    "wilaya_id": 15,
    "code_postal": "1553",
    "has_stop_desk": 0
  },
  "13": {
    "nom": "Agouni Gueghrane",
    "wilaya_id": 15,
    "code_postal": "1561",
    "has_stop_desk": 0
  },
  "14": {
    "nom": "Ahl El Ksar",
    "wilaya_id": 10,
    "code_postal": "1022",
    "has_stop_desk": 0
  },
  "15": {
    "nom": "Ahmed Rachedi",
    "wilaya_id": 43,
    "code_postal": "4311",
    "has_stop_desk": 0
  },
  "16": {
    "nom": "Ahmer El Ain",
    "wilaya_id": 42,
    "code_postal": "4219",
    "has_stop_desk": 0
  },
  "17": {
    "nom": "Ain Abessa",
    "wilaya_id": 19,
    "code_postal": "1914",
    "has_stop_desk": 0
  },
  "18": {
    "nom": "Ain Abid",
    "wilaya_id": 25,
    "code_postal": "2507",
    "has_stop_desk": 0
  },
  "19": {
    "nom": "Ain Adden",
    "wilaya_id": 22,
    "code_postal": "2230",
    "has_stop_desk": 0
  },
  "20": {
    "nom": "Ain Amguel",
    "wilaya_id": 11,
    "code_postal": "1109",
    "has_stop_desk": 0
  },
  "21": {
    "nom": "Ain Arnat",
    "wilaya_id": 19,
    "code_postal": "1926",
    "has_stop_desk": 0
  },
  "22": {
    "nom": "Ain Azel",
    "wilaya_id": 19,
    "code_postal": "1940",
    "has_stop_desk": 0
  },
  "23": {
    "nom": "Ain Babouche",
    "wilaya_id": 4,
    "code_postal": "408",
    "has_stop_desk": 0
  },
  "24": {
    "nom": "Ain Beida",
    "wilaya_id": 4,
    "code_postal": "402",
    "has_stop_desk": 0
  },
  "25": {
    "nom": "Ain Beida",
    "wilaya_id": 30,
    "code_postal": "3002",
    "has_stop_desk": 0
  },
  "26": {
    "nom": "Ain Beida Harriche",
    "wilaya_id": 43,
    "code_postal": "4330",
    "has_stop_desk": 0
  },
  "27": {
    "nom": "Ain Ben Beida",
    "wilaya_id": 24,
    "code_postal": "2414",
    "has_stop_desk": 0
  },
  "28": {
    "nom": "Ain Ben Khelil",
    "wilaya_id": 45,
    "code_postal": "4509",
    "has_stop_desk": 0
  },
  "29": {
    "nom": "Ain Benian",
    "wilaya_id": 16,
    "code_postal": "1657",
    "has_stop_desk": 1
  },
  "30": {
    "nom": "Ain Benian",
    "wilaya_id": 44,
    "code_postal": "4426",
    "has_stop_desk": 0
  },
  "31": {
    "nom": "Ain Berda",
    "wilaya_id": 23,
    "code_postal": "2309",
    "has_stop_desk": 0
  },
  "32": {
    "nom": "Ain Bessem",
    "wilaya_id": 10,
    "code_postal": "1035",
    "has_stop_desk": 0
  },
  "33": {
    "nom": "Ain Biya",
    "wilaya_id": 31,
    "code_postal": "3126",
    "has_stop_desk": 0
  },
  "34": {
    "nom": "Ain Bouchekif",
    "wilaya_id": 14,
    "code_postal": "1403",
    "has_stop_desk": 0
  },
  "35": {
    "nom": "Ain Boucif",
    "wilaya_id": 26,
    "code_postal": "2604",
    "has_stop_desk": 0
  },
  "36": {
    "nom": "Ain Boudinar",
    "wilaya_id": 27,
    "code_postal": "2728",
    "has_stop_desk": 0
  },
  "37": {
    "nom": "Ain Bouyahia",
    "wilaya_id": 44,
    "code_postal": "4433",
    "has_stop_desk": 0
  },
  "38": {
    "nom": "Ain Bouziane",
    "wilaya_id": 21,
    "code_postal": "2122",
    "has_stop_desk": 0
  },
  "39": {
    "nom": "Ain Charchar",
    "wilaya_id": 21,
    "code_postal": "2106",
    "has_stop_desk": 0
  },
  "40": {
    "nom": "Ain Chouhada",
    "wilaya_id": 17,
    "code_postal": "1723",
    "has_stop_desk": 0
  },
  "41": {
    "nom": "Ain Defla",
    "wilaya_id": 44,
    "code_postal": "4401",
    "has_stop_desk": 0
  },
  "42": {
    "nom": "Ain Deheb",
    "wilaya_id": 14,
    "code_postal": "1406",
    "has_stop_desk": 0
  },
  "43": {
    "nom": "Ain Diss",
    "wilaya_id": 4,
    "code_postal": "415",
    "has_stop_desk": 0
  },
  "44": {
    "nom": "Ain Djasser",
    "wilaya_id": 5,
    "code_postal": "519",
    "has_stop_desk": 1
  },
  "45": {
    "nom": "Ain El Arbaa",
    "wilaya_id": 46,
    "code_postal": "4609",
    "has_stop_desk": 0
  },
  "46": {
    "nom": "Ain El Assel",
    "wilaya_id": 36,
    "code_postal": "3606",
    "has_stop_desk": 0
  },
  "47": {
    "nom": "Ain El Berd",
    "wilaya_id": 22,
    "code_postal": "2228",
    "has_stop_desk": 0
  },
  "48": {
    "nom": "Ain El Hadid",
    "wilaya_id": 14,
    "code_postal": "1418",
    "has_stop_desk": 0
  },
  "49": {
    "nom": "Ain El Hadjar",
    "wilaya_id": 10,
    "code_postal": "1025",
    "has_stop_desk": 0
  },
  "50": {
    "nom": "Ain El Hadjar",
    "wilaya_id": 20,
    "code_postal": "2003",
    "has_stop_desk": 0
  },
  "51": {
    "nom": "Ain El Hadjel",
    "wilaya_id": 28,
    "code_postal": "2817",
    "has_stop_desk": 0
  },
  "52": {
    "nom": "Ain El Hammam",
    "wilaya_id": 15,
    "code_postal": "1502",
    "has_stop_desk": 0
  },
  "53": {
    "nom": "Ain El Ibel",
    "wilaya_id": 17,
    "code_postal": "1730",
    "has_stop_desk": 0
  },
  "54": {
    "nom": "Ain El Kebira",
    "wilaya_id": 19,
    "code_postal": "1902",
    "has_stop_desk": 0
  },
  "55": {
    "nom": "Ain El Melh",
    "wilaya_id": 28,
    "code_postal": "2841",
    "has_stop_desk": 0
  },
  "56": {
    "nom": "Ain El Orak",
    "wilaya_id": 32,
    "code_postal": "3208",
    "has_stop_desk": 0
  },
  "57": {
    "nom": "Ain Fares",
    "wilaya_id": 28,
    "code_postal": "2837",
    "has_stop_desk": 0
  },
  "58": {
    "nom": "Ain Fares",
    "wilaya_id": 29,
    "code_postal": "2924",
    "has_stop_desk": 0
  },
  "59": {
    "nom": "Ain Fekan",
    "wilaya_id": 29,
    "code_postal": "2918",
    "has_stop_desk": 0
  },
  "60": {
    "nom": "Ain Fekka",
    "wilaya_id": 17,
    "code_postal": "1735",
    "has_stop_desk": 0
  },
  "61": {
    "nom": "Ain Fekroune",
    "wilaya_id": 4,
    "code_postal": "425",
    "has_stop_desk": 0
  },
  "62": {
    "nom": "Ain Ferah",
    "wilaya_id": 29,
    "code_postal": "2911",
    "has_stop_desk": 0
  },
  "63": {
    "nom": "Ain Fettah",
    "wilaya_id": 13,
    "code_postal": "1331",
    "has_stop_desk": 0
  },
  "64": {
    "nom": "Ain Fezza",
    "wilaya_id": 13,
    "code_postal": "1312",
    "has_stop_desk": 0
  },
  "65": {
    "nom": "Ain Frass",
    "wilaya_id": 29,
    "code_postal": "2925",
    "has_stop_desk": 0
  },
  "66": {
    "nom": "Ain Ghoraba",
    "wilaya_id": 13,
    "code_postal": "1349",
    "has_stop_desk": 0
  },
  "67": {
    "nom": "Ain Hessania",
    "wilaya_id": 24,
    "code_postal": "2427",
    "has_stop_desk": 0
  },
  "68": {
    "nom": "Ain Kada",
    "wilaya_id": 22,
    "code_postal": "2225",
    "has_stop_desk": 0
  },
  "69": {
    "nom": "Ain Kebira",
    "wilaya_id": 13,
    "code_postal": "1353",
    "has_stop_desk": 0
  },
  "70": {
    "nom": "Ain Kechera",
    "wilaya_id": 21,
    "code_postal": "2127",
    "has_stop_desk": 0
  },
  "71": {
    "nom": "Ain Kercha",
    "wilaya_id": 4,
    "code_postal": "412",
    "has_stop_desk": 0
  },
  "72": {
    "nom": "Ain Kerma",
    "wilaya_id": 31,
    "code_postal": "3125",
    "has_stop_desk": 0
  },
  "73": {
    "nom": "Ain Kerma",
    "wilaya_id": 36,
    "code_postal": "3621",
    "has_stop_desk": 0
  },
  "74": {
    "nom": "Ain Kermes",
    "wilaya_id": 14,
    "code_postal": "1428",
    "has_stop_desk": 0
  },
  "75": {
    "nom": "Ain Khadra",
    "wilaya_id": 28,
    "code_postal": "2813",
    "has_stop_desk": 0
  },
  "76": {
    "nom": "Ain Kihal",
    "wilaya_id": 46,
    "code_postal": "4603",
    "has_stop_desk": 0
  },
  "77": {
    "nom": "Ain Lahdjar",
    "wilaya_id": 19,
    "code_postal": "1918",
    "has_stop_desk": 0
  },
  "78": {
    "nom": "Ain Laloui",
    "wilaya_id": 10,
    "code_postal": "1041",
    "has_stop_desk": 0
  },
  "79": {
    "nom": "Ain Larbi",
    "wilaya_id": 24,
    "code_postal": "2423",
    "has_stop_desk": 0
  },
  "80": {
    "nom": "Ain Lechiakh",
    "wilaya_id": 44,
    "code_postal": "4414",
    "has_stop_desk": 0
  },
  "81": {
    "nom": "Ain Legradj",
    "wilaya_id": 19,
    "code_postal": "1913",
    "has_stop_desk": 0
  },
  "82": {
    "nom": "Ain M'lila",
    "wilaya_id": 4,
    "code_postal": "403",
    "has_stop_desk": 0
  },
  "83": {
    "nom": "Ain Maabed",
    "wilaya_id": 17,
    "code_postal": "1705",
    "has_stop_desk": 0
  },
  "84": {
    "nom": "Ain Mahdi",
    "wilaya_id": 3,
    "code_postal": "307",
    "has_stop_desk": 0
  },
  "85": {
    "nom": "Ain Makhlouf",
    "wilaya_id": 24,
    "code_postal": "2413",
    "has_stop_desk": 0
  },
  "86": {
    "nom": "Ain Mellouk",
    "wilaya_id": 43,
    "code_postal": "4305",
    "has_stop_desk": 0
  },
  "87": {
    "nom": "Ain Merane",
    "wilaya_id": 2,
    "code_postal": "232",
    "has_stop_desk": 0
  },
  "88": {
    "nom": "Ain Naga",
    "wilaya_id": 7,
    "code_postal": "714",
    "has_stop_desk": 0
  },
  "89": {
    "nom": "Ain Nehala",
    "wilaya_id": 13,
    "code_postal": "1325",
    "has_stop_desk": 0
  },
  "90": {
    "nom": "Ain Nouissy",
    "wilaya_id": 27,
    "code_postal": "2705",
    "has_stop_desk": 0
  },
  "91": {
    "nom": "Ain Ouksir",
    "wilaya_id": 26,
    "code_postal": "2641",
    "has_stop_desk": 0
  },
  "92": {
    "nom": "Ain Oulmane",
    "wilaya_id": 19,
    "code_postal": "1928",
    "has_stop_desk": 0
  },
  "93": {
    "nom": "Ain Oussera",
    "wilaya_id": 17,
    "code_postal": "1731",
    "has_stop_desk": 0
  },
  "94": {
    "nom": "Ain Rahma",
    "wilaya_id": 48,
    "code_postal": "4824",
    "has_stop_desk": 0
  },
  "95": {
    "nom": "Ain Reggada",
    "wilaya_id": 24,
    "code_postal": "2432",
    "has_stop_desk": 0
  },
  "96": {
    "nom": "Ain Rich",
    "wilaya_id": 28,
    "code_postal": "2844",
    "has_stop_desk": 0
  },
  "97": {
    "nom": "Ain Romana",
    "wilaya_id": 9,
    "code_postal": "924",
    "has_stop_desk": 1
  },
  "98": {
    "nom": "Ain Roua",
    "wilaya_id": 19,
    "code_postal": "1906",
    "has_stop_desk": 0
  },
  "99": {
    "nom": "Ain Safra",
    "wilaya_id": 45,
    "code_postal": "4503",
    "has_stop_desk": 0
  },
  "100": {
    "nom": "Ain Sebt",
    "wilaya_id": 19,
    "code_postal": "1949",
    "has_stop_desk": 0
  },
  "101": {
    "nom": "Ain Sekhouna",
    "wilaya_id": 20,
    "code_postal": "2013",
    "has_stop_desk": 0
  },
  "102": {
    "nom": "Ain Sidi Ali",
    "wilaya_id": 3,
    "code_postal": "311",
    "has_stop_desk": 0
  },
  "103": {
    "nom": "Ain Sidi Cherif",
    "wilaya_id": 27,
    "code_postal": "2721",
    "has_stop_desk": 0
  },
  "104": {
    "nom": "Ain Smara",
    "wilaya_id": 25,
    "code_postal": "2510",
    "has_stop_desk": 0
  },
  "105": {
    "nom": "Ain Soltane",
    "wilaya_id": 20,
    "code_postal": "2016",
    "has_stop_desk": 0
  },
  "106": {
    "nom": "Ain Soltane",
    "wilaya_id": 41,
    "code_postal": "4118",
    "has_stop_desk": 0
  },
  "107": {
    "nom": "Ain Soltane",
    "wilaya_id": 44,
    "code_postal": "4420",
    "has_stop_desk": 0
  },
  "108": {
    "nom": "Ain Taghrout",
    "wilaya_id": 34,
    "code_postal": "3408",
    "has_stop_desk": 0
  },
  "109": {
    "nom": "Ain Tagourait",
    "wilaya_id": 42,
    "code_postal": "4213",
    "has_stop_desk": 0
  },
  "110": {
    "nom": "Ain Tallout",
    "wilaya_id": 13,
    "code_postal": "1303",
    "has_stop_desk": 0
  },
  "111": {
    "nom": "Ain Tarek",
    "wilaya_id": 48,
    "code_postal": "4819",
    "has_stop_desk": 0
  },
  "112": {
    "nom": "Ain Taya",
    "wilaya_id": 16,
    "code_postal": "1641",
    "has_stop_desk": 1
  },
  "113": {
    "nom": "Ain Tedles",
    "wilaya_id": 27,
    "code_postal": "2707",
    "has_stop_desk": 0
  },
  "114": {
    "nom": "Ain Temouchent",
    "wilaya_id": 46,
    "code_postal": "4601",
    "has_stop_desk": 0
  },
  "115": {
    "nom": "Ain Tesra",
    "wilaya_id": 34,
    "code_postal": "3430",
    "has_stop_desk": 0
  },
  "116": {
    "nom": "Ain Thrid",
    "wilaya_id": 22,
    "code_postal": "2215",
    "has_stop_desk": 0
  },
  "117": {
    "nom": "Ain Tindamine",
    "wilaya_id": 22,
    "code_postal": "2224",
    "has_stop_desk": 0
  },
  "118": {
    "nom": "Ain Tine",
    "wilaya_id": 43,
    "code_postal": "4325",
    "has_stop_desk": 0
  },
  "119": {
    "nom": "Ain Tolba",
    "wilaya_id": 46,
    "code_postal": "4618",
    "has_stop_desk": 0
  },
  "120": {
    "nom": "Ain Tork",
    "wilaya_id": 44,
    "code_postal": "4423",
    "has_stop_desk": 0
  },
  "121": {
    "nom": "Ain Touila",
    "wilaya_id": 40,
    "code_postal": "4006",
    "has_stop_desk": 0
  },
  "122": {
    "nom": "Ain Touta",
    "wilaya_id": 5,
    "code_postal": "545",
    "has_stop_desk": 1
  },
  "123": {
    "nom": "Ain Turk",
    "wilaya_id": 10,
    "code_postal": "1029",
    "has_stop_desk": 0
  },
  "124": {
    "nom": "Ain Turk",
    "wilaya_id": 31,
    "code_postal": "3109",
    "has_stop_desk": 0
  },
  "125": {
    "nom": "Ain Yagout",
    "wilaya_id": 5,
    "code_postal": "522",
    "has_stop_desk": 0
  },
  "126": {
    "nom": "Ain Youcef",
    "wilaya_id": 13,
    "code_postal": "1315",
    "has_stop_desk": 0
  },
  "127": {
    "nom": "Ain Zaatout",
    "wilaya_id": 7,
    "code_postal": "718",
    "has_stop_desk": 0
  },
  "128": {
    "nom": "Ain Zana",
    "wilaya_id": 41,
    "code_postal": "4117",
    "has_stop_desk": 0
  },
  "129": {
    "nom": "Ain Zaouia",
    "wilaya_id": 15,
    "code_postal": "1525",
    "has_stop_desk": 0
  },
  "130": {
    "nom": "Ain Zarit",
    "wilaya_id": 14,
    "code_postal": "1405",
    "has_stop_desk": 0
  },
  "131": {
    "nom": "Ain Zerga",
    "wilaya_id": 12,
    "code_postal": "1223",
    "has_stop_desk": 0
  },
  "132": {
    "nom": "Ain Zitoun",
    "wilaya_id": 4,
    "code_postal": "427",
    "has_stop_desk": 0
  },
  "133": {
    "nom": "Ain Zouit",
    "wilaya_id": 21,
    "code_postal": "2102",
    "has_stop_desk": 0
  },
  "134": {
    "nom": "Aissaouia",
    "wilaya_id": 26,
    "code_postal": "2605",
    "has_stop_desk": 0
  },
  "135": {
    "nom": "Ait Aggouacha",
    "wilaya_id": 15,
    "code_postal": "1535",
    "has_stop_desk": 0
  },
  "136": {
    "nom": "Ait Bouaddou",
    "wilaya_id": 15,
    "code_postal": "1565",
    "has_stop_desk": 0
  },
  "137": {
    "nom": "Ait Boumehdi",
    "wilaya_id": 15,
    "code_postal": "1530",
    "has_stop_desk": 0
  },
  "138": {
    "nom": "Ait Chafaa",
    "wilaya_id": 15,
    "code_postal": "1513",
    "has_stop_desk": 0
  },
  "139": {
    "nom": "Ait Khellili",
    "wilaya_id": 15,
    "code_postal": "1558",
    "has_stop_desk": 0
  },
  "140": {
    "nom": "Ait Laaziz",
    "wilaya_id": 10,
    "code_postal": "1008",
    "has_stop_desk": 0
  },
  "141": {
    "nom": "Ait Mahmoud",
    "wilaya_id": 15,
    "code_postal": "1528",
    "has_stop_desk": 0
  },
  "142": {
    "nom": "Ait Naoual Mezada",
    "wilaya_id": 19,
    "code_postal": "1951",
    "has_stop_desk": 0
  },
  "143": {
    "nom": "Ait Oumalou",
    "wilaya_id": 15,
    "code_postal": "1542",
    "has_stop_desk": 0
  },
  "144": {
    "nom": "Ait R'zine",
    "wilaya_id": 6,
    "code_postal": "628",
    "has_stop_desk": 0
  },
  "145": {
    "nom": "Ait Smail",
    "wilaya_id": 6,
    "code_postal": "647",
    "has_stop_desk": 0
  },
  "146": {
    "nom": "Ait Tizi",
    "wilaya_id": 19,
    "code_postal": "1954",
    "has_stop_desk": 0
  },
  "147": {
    "nom": "Ait Toudert",
    "wilaya_id": 15,
    "code_postal": "1567",
    "has_stop_desk": 0
  },
  "148": {
    "nom": "Ait Yahia",
    "wilaya_id": 15,
    "code_postal": "1527",
    "has_stop_desk": 0
  },
  "149": {
    "nom": "Ait Yahia Moussa",
    "wilaya_id": 15,
    "code_postal": "1556",
    "has_stop_desk": 0
  },
  "150": {
    "nom": "Akabli",
    "wilaya_id": 1,
    "code_postal": "119",
    "has_stop_desk": 0
  },
  "151": {
    "nom": "Akbil",
    "wilaya_id": 15,
    "code_postal": "1503",
    "has_stop_desk": 0
  },
  "152": {
    "nom": "Akbou",
    "wilaya_id": 6,
    "code_postal": "625",
    "has_stop_desk": 0
  },
  "153": {
    "nom": "Akerrou",
    "wilaya_id": 15,
    "code_postal": "1544",
    "has_stop_desk": 0
  },
  "154": {
    "nom": "Akfadou",
    "wilaya_id": 6,
    "code_postal": "642",
    "has_stop_desk": 0
  },
  "155": {
    "nom": "Alaimia",
    "wilaya_id": 29,
    "code_postal": "2928",
    "has_stop_desk": 0
  },
  "156": {
    "nom": "Alger Centre",
    "wilaya_id": 16,
    "code_postal": "1601",
    "has_stop_desk": 1
  },
  "157": {
    "nom": "Amalou",
    "wilaya_id": 6,
    "code_postal": "616",
    "has_stop_desk": 0
  },
  "158": {
    "nom": "Amarnas",
    "wilaya_id": 22,
    "code_postal": "2212",
    "has_stop_desk": 0
  },
  "159": {
    "nom": "Amieur",
    "wilaya_id": 13,
    "code_postal": "1314",
    "has_stop_desk": 0
  },
  "160": {
    "nom": "Amira Arres",
    "wilaya_id": 43,
    "code_postal": "4322",
    "has_stop_desk": 0
  },
  "161": {
    "nom": "Amizour",
    "wilaya_id": 6,
    "code_postal": "602",
    "has_stop_desk": 0
  },
  "162": {
    "nom": "Ammal",
    "wilaya_id": 35,
    "code_postal": "3524",
    "has_stop_desk": 0
  },
  "163": {
    "nom": "Ammari",
    "wilaya_id": 38,
    "code_postal": "3813",
    "has_stop_desk": 0
  },
  "164": {
    "nom": "Ammi Moussa",
    "wilaya_id": 48,
    "code_postal": "4811",
    "has_stop_desk": 0
  },
  "165": {
    "nom": "Amoucha",
    "wilaya_id": 19,
    "code_postal": "1927",
    "has_stop_desk": 0
  },
  "166": {
    "nom": "Amourah",
    "wilaya_id": 17,
    "code_postal": "1734",
    "has_stop_desk": 0
  },
  "167": {
    "nom": "Annaba",
    "wilaya_id": 23,
    "code_postal": "2301",
    "has_stop_desk": 0
  },
  "168": {
    "nom": "Aokas",
    "wilaya_id": 6,
    "code_postal": "622",
    "has_stop_desk": 0
  },
  "169": {
    "nom": "Aomar",
    "wilaya_id": 10,
    "code_postal": "1016",
    "has_stop_desk": 0
  },
  "170": {
    "nom": "Aoubellil",
    "wilaya_id": 46,
    "code_postal": "4613",
    "has_stop_desk": 0
  },
  "171": {
    "nom": "Aouf",
    "wilaya_id": 29,
    "code_postal": "2923",
    "has_stop_desk": 0
  },
  "172": {
    "nom": "Aougrout",
    "wilaya_id": 49,
    "code_postal": "4908",
    "has_stop_desk": 0
  },
  "173": {
    "nom": "Aoulef",
    "wilaya_id": 1,
    "code_postal": "112",
    "has_stop_desk": 0
  },
  "174": {
    "nom": "Arbaouat",
    "wilaya_id": 32,
    "code_postal": "3209",
    "has_stop_desk": 0
  },
  "175": {
    "nom": "Arib",
    "wilaya_id": 44,
    "code_postal": "4406",
    "has_stop_desk": 0
  },
  "176": {
    "nom": "Arris",
    "wilaya_id": 5,
    "code_postal": "516",
    "has_stop_desk": 0
  },
  "177": {
    "nom": "Arzew",
    "wilaya_id": 31,
    "code_postal": "3106",
    "has_stop_desk": 0
  },
  "178": {
    "nom": "Asfour",
    "wilaya_id": 36,
    "code_postal": "3617",
    "has_stop_desk": 0
  },
  "179": {
    "nom": "Assela",
    "wilaya_id": 45,
    "code_postal": "4507",
    "has_stop_desk": 0
  },
  "180": {
    "nom": "Assi Youcef",
    "wilaya_id": 15,
    "code_postal": "1566",
    "has_stop_desk": 0
  },
  "181": {
    "nom": "Attatba",
    "wilaya_id": 42,
    "code_postal": "4225",
    "has_stop_desk": 0
  },
  "182": {
    "nom": "Azails",
    "wilaya_id": 13,
    "code_postal": "1321",
    "has_stop_desk": 0
  },
  "183": {
    "nom": "Azazga",
    "wilaya_id": 15,
    "code_postal": "1518",
    "has_stop_desk": 0
  },
  "184": {
    "nom": "Azeffoun",
    "wilaya_id": 15,
    "code_postal": "1537",
    "has_stop_desk": 0
  },
  "185": {
    "nom": "Azil Abedelkader",
    "wilaya_id": 5,
    "code_postal": "515",
    "has_stop_desk": 0
  },
  "186": {
    "nom": "Aziz",
    "wilaya_id": 26,
    "code_postal": "2632",
    "has_stop_desk": 0
  },
  "187": {
    "nom": "Azzaba",
    "wilaya_id": 21,
    "code_postal": "2104",
    "has_stop_desk": 0
  },
  "188": {
    "nom": "Baata",
    "wilaya_id": 26,
    "code_postal": "2624",
    "has_stop_desk": 0
  },
  "189": {
    "nom": "Bab El Assa",
    "wilaya_id": 13,
    "code_postal": "1318",
    "has_stop_desk": 0
  },
  "190": {
    "nom": "Bab El Oued",
    "wilaya_id": 16,
    "code_postal": "1605",
    "has_stop_desk": 0
  },
  "191": {
    "nom": "Bab Ezzouar",
    "wilaya_id": 16,
    "code_postal": "1621",
    "has_stop_desk": 0
  },
  "192": {
    "nom": "Baba Hesen",
    "wilaya_id": 16,
    "code_postal": "1647",
    "has_stop_desk": 0
  },
  "193": {
    "nom": "Babar",
    "wilaya_id": 40,
    "code_postal": "4013",
    "has_stop_desk": 0
  },
  "194": {
    "nom": "Babor",
    "wilaya_id": 19,
    "code_postal": "1916",
    "has_stop_desk": 0
  },
  "195": {
    "nom": "Bachedjerah",
    "wilaya_id": 16,
    "code_postal": "1619",
    "has_stop_desk": 0
  },
  "196": {
    "nom": "Badredine El Mokrani",
    "wilaya_id": 22,
    "code_postal": "2209",
    "has_stop_desk": 0
  },
  "197": {
    "nom": "Baghai",
    "wilaya_id": 40,
    "code_postal": "4004",
    "has_stop_desk": 0
  },
  "198": {
    "nom": "Baghlia",
    "wilaya_id": 35,
    "code_postal": "3505",
    "has_stop_desk": 0
  },
  "199": {
    "nom": "Bains Romains",
    "wilaya_id": 16,
    "code_postal": "1624",
    "has_stop_desk": 0
  },
  "200": {
    "nom": "Baraki",
    "wilaya_id": 16,
    "code_postal": "1614",
    "has_stop_desk": 0
  },
  "201": {
    "nom": "Barbacha",
    "wilaya_id": 6,
    "code_postal": "634",
    "has_stop_desk": 0
  },
  "202": {
    "nom": "Barbouche",
    "wilaya_id": 44,
    "code_postal": "4428",
    "has_stop_desk": 0
  },
  "203": {
    "nom": "Barika",
    "wilaya_id": 5,
    "code_postal": "542",
    "has_stop_desk": 0
  },
  "204": {
    "nom": "Bathia",
    "wilaya_id": 44,
    "code_postal": "4431",
    "has_stop_desk": 0
  },
  "205": {
    "nom": "Batna",
    "wilaya_id": 5,
    "code_postal": "501",
    "has_stop_desk": 0
  },
  "206": {
    "nom": "Bayadha",
    "wilaya_id": 39,
    "code_postal": "3904",
    "has_stop_desk": 0
  },
  "207": {
    "nom": "Bazer Sakra",
    "wilaya_id": 19,
    "code_postal": "1931",
    "has_stop_desk": 0
  },
  "208": {
    "nom": "Bechar",
    "wilaya_id": 8,
    "code_postal": "801",
    "has_stop_desk": 0
  },
  "209": {
    "nom": "Bechloul",
    "wilaya_id": 10,
    "code_postal": "1033",
    "has_stop_desk": 0
  },
  "210": {
    "nom": "Bedjene",
    "wilaya_id": 12,
    "code_postal": "1226",
    "has_stop_desk": 0
  },
  "211": {
    "nom": "Behir Chergui",
    "wilaya_id": 4,
    "code_postal": "404",
    "has_stop_desk": 0
  },
  "212": {
    "nom": "Beidha",
    "wilaya_id": 3,
    "code_postal": "312",
    "has_stop_desk": 0
  },
  "213": {
    "nom": "Beidha Bordj",
    "wilaya_id": 19,
    "code_postal": "1929",
    "has_stop_desk": 0
  },
  "214": {
    "nom": "Bejaia",
    "wilaya_id": 6,
    "code_postal": "601",
    "has_stop_desk": 0
  },
  "215": {
    "nom": "Bekkaria",
    "wilaya_id": 12,
    "code_postal": "1217",
    "has_stop_desk": 0
  },
  "216": {
    "nom": "Bekkouche Lakhdar",
    "wilaya_id": 21,
    "code_postal": "2107",
    "has_stop_desk": 0
  },
  "217": {
    "nom": "Belaas",
    "wilaya_id": 44,
    "code_postal": "4436",
    "has_stop_desk": 0
  },
  "218": {
    "nom": "Belaassel Bouzagza",
    "wilaya_id": 48,
    "code_postal": "4803",
    "has_stop_desk": 0
  },
  "219": {
    "nom": "Belaiba",
    "wilaya_id": 28,
    "code_postal": "2815",
    "has_stop_desk": 0
  },
  "220": {
    "nom": "Belarbi",
    "wilaya_id": 22,
    "code_postal": "2242",
    "has_stop_desk": 0
  },
  "221": {
    "nom": "Belimour",
    "wilaya_id": 34,
    "code_postal": "3412",
    "has_stop_desk": 0
  },
  "222": {
    "nom": "Belkheir",
    "wilaya_id": 24,
    "code_postal": "2410",
    "has_stop_desk": 0
  },
  "223": {
    "nom": "Bellaa",
    "wilaya_id": 19,
    "code_postal": "1925",
    "has_stop_desk": 0
  },
  "224": {
    "nom": "Ben Aknoun",
    "wilaya_id": 16,
    "code_postal": "1622",
    "has_stop_desk": 1
  },
  "225": {
    "nom": "Ben Allal",
    "wilaya_id": 44,
    "code_postal": "4425",
    "has_stop_desk": 0
  },
  "226": {
    "nom": "Ben Azzouz",
    "wilaya_id": 21,
    "code_postal": "2108",
    "has_stop_desk": 0
  },
  "227": {
    "nom": "Ben Badis",
    "wilaya_id": 22,
    "code_postal": "2245",
    "has_stop_desk": 0
  },
  "228": {
    "nom": "Ben Badis",
    "wilaya_id": 25,
    "code_postal": "2503",
    "has_stop_desk": 0
  },
  "229": {
    "nom": "Ben Chicao",
    "wilaya_id": 26,
    "code_postal": "2630",
    "has_stop_desk": 0
  },
  "230": {
    "nom": "Ben Choud",
    "wilaya_id": 35,
    "code_postal": "3522",
    "has_stop_desk": 0
  },
  "231": {
    "nom": "Ben Daoud",
    "wilaya_id": 34,
    "code_postal": "3406",
    "has_stop_desk": 0
  },
  "232": {
    "nom": "Ben Djarah",
    "wilaya_id": 24,
    "code_postal": "2411",
    "has_stop_desk": 0
  },
  "233": {
    "nom": "Ben Freha",
    "wilaya_id": 31,
    "code_postal": "3120",
    "has_stop_desk": 0
  },
  "234": {
    "nom": "Ben Guecha",
    "wilaya_id": 39,
    "code_postal": "3919",
    "has_stop_desk": 0
  },
  "235": {
    "nom": "Ben M Hidi",
    "wilaya_id": 36,
    "code_postal": "3603",
    "has_stop_desk": 0
  },
  "236": {
    "nom": "Ben Srour",
    "wilaya_id": 28,
    "code_postal": "2824",
    "has_stop_desk": 0
  },
  "237": {
    "nom": "Benabdelmalek Ramdane",
    "wilaya_id": 27,
    "code_postal": "2713",
    "has_stop_desk": 0
  },
  "238": {
    "nom": "Benacer Benchohra",
    "wilaya_id": 3,
    "code_postal": "303",
    "has_stop_desk": 0
  },
  "239": {
    "nom": "Benaceur",
    "wilaya_id": 55,
    "code_postal": "5510",
    "has_stop_desk": 0
  },
  "240": {
    "nom": "Benachiba Chelia",
    "wilaya_id": 22,
    "code_postal": "2251",
    "has_stop_desk": 0
  },
  "241": {
    "nom": "Benairia",
    "wilaya_id": 2,
    "code_postal": "203",
    "has_stop_desk": 0
  },
  "242": {
    "nom": "Bendaoud",
    "wilaya_id": 48,
    "code_postal": "4835",
    "has_stop_desk": 0
  },
  "243": {
    "nom": "Benhar",
    "wilaya_id": 17,
    "code_postal": "1732",
    "has_stop_desk": 0
  },
  "244": {
    "nom": "Beni Abbes",
    "wilaya_id": 52,
    "code_postal": "5201",
    "has_stop_desk": 0
  },
  "245": {
    "nom": "Beni Aissi",
    "wilaya_id": 15,
    "code_postal": "1515",
    "has_stop_desk": 0
  },
  "246": {
    "nom": "Beni Amrane",
    "wilaya_id": 35,
    "code_postal": "3525",
    "has_stop_desk": 0
  },
  "247": {
    "nom": "Beni Aziz",
    "wilaya_id": 19,
    "code_postal": "1903",
    "has_stop_desk": 0
  },
  "248": {
    "nom": "Beni Bahdel",
    "wilaya_id": 13,
    "code_postal": "1342",
    "has_stop_desk": 0
  },
  "249": {
    "nom": "Beni Bechir",
    "wilaya_id": 21,
    "code_postal": "2124",
    "has_stop_desk": 0
  },
  "250": {
    "nom": "Beni Bouattab",
    "wilaya_id": 2,
    "code_postal": "235",
    "has_stop_desk": 0
  },
  "251": {
    "nom": "Beni Boussaid",
    "wilaya_id": 13,
    "code_postal": "1338",
    "has_stop_desk": 0
  },
  "252": {
    "nom": "Beni Chaib",
    "wilaya_id": 38,
    "code_postal": "3805",
    "has_stop_desk": 0
  },
  "253": {
    "nom": "Beni Chebana",
    "wilaya_id": 19,
    "code_postal": "1909",
    "has_stop_desk": 0
  },
  "254": {
    "nom": "Beni Dejllil",
    "wilaya_id": 6,
    "code_postal": "623",
    "has_stop_desk": 0
  },
  "255": {
    "nom": "Beni Dergoun",
    "wilaya_id": 48,
    "code_postal": "4813",
    "has_stop_desk": 0
  },
  "256": {
    "nom": "Beni Douala",
    "wilaya_id": 15,
    "code_postal": "1532",
    "has_stop_desk": 0
  },
  "257": {
    "nom": "Beni Fouda",
    "wilaya_id": 19,
    "code_postal": "1944",
    "has_stop_desk": 0
  },
  "258": {
    "nom": "Beni Foudhala El Hakania",
    "wilaya_id": 5,
    "code_postal": "532",
    "has_stop_desk": 0
  },
  "259": {
    "nom": "Beni Hamidene",
    "wilaya_id": 25,
    "code_postal": "2508",
    "has_stop_desk": 0
  },
  "260": {
    "nom": "Beni Haoua",
    "wilaya_id": 2,
    "code_postal": "207",
    "has_stop_desk": 0
  },
  "261": {
    "nom": "Beni Ikhlef",
    "wilaya_id": 52,
    "code_postal": "5204",
    "has_stop_desk": 0
  },
  "262": {
    "nom": "Beni Ilmane",
    "wilaya_id": 28,
    "code_postal": "2845",
    "has_stop_desk": 0
  },
  "263": {
    "nom": "Beni K'sila",
    "wilaya_id": 6,
    "code_postal": "635",
    "has_stop_desk": 0
  },
  "264": {
    "nom": "Beni Khaled",
    "wilaya_id": 13,
    "code_postal": "1348",
    "has_stop_desk": 0
  },
  "265": {
    "nom": "Beni Lahcene",
    "wilaya_id": 38,
    "code_postal": "3822",
    "has_stop_desk": 0
  },
  "266": {
    "nom": "Beni Mallikeche",
    "wilaya_id": 6,
    "code_postal": "638",
    "has_stop_desk": 0
  },
  "267": {
    "nom": "Beni Mered",
    "wilaya_id": 9,
    "code_postal": "921",
    "has_stop_desk": 1
  },
  "268": {
    "nom": "Beni Messous",
    "wilaya_id": 16,
    "code_postal": "1632",
    "has_stop_desk": 0
  },
  "269": {
    "nom": "Beni Mester",
    "wilaya_id": 13,
    "code_postal": "1302",
    "has_stop_desk": 0
  },
  "270": {
    "nom": "Beni Mezline",
    "wilaya_id": 24,
    "code_postal": "2416",
    "has_stop_desk": 0
  },
  "271": {
    "nom": "Beni Mileuk",
    "wilaya_id": 42,
    "code_postal": "4227",
    "has_stop_desk": 0
  },
  "272": {
    "nom": "Beni Mouhli",
    "wilaya_id": 19,
    "code_postal": "1946",
    "has_stop_desk": 0
  },
  "273": {
    "nom": "Beni Ouarsous",
    "wilaya_id": 13,
    "code_postal": "1336",
    "has_stop_desk": 0
  },
  "274": {
    "nom": "Beni Ouartilane",
    "wilaya_id": 19,
    "code_postal": "1922",
    "has_stop_desk": 0
  },
  "275": {
    "nom": "Beni Oulbane",
    "wilaya_id": 21,
    "code_postal": "2121",
    "has_stop_desk": 0
  },
  "276": {
    "nom": "Beni Ounif",
    "wilaya_id": 8,
    "code_postal": "821",
    "has_stop_desk": 0
  },
  "277": {
    "nom": "Beni Oussine",
    "wilaya_id": 19,
    "code_postal": "1953",
    "has_stop_desk": 0
  },
  "278": {
    "nom": "Beni Rached",
    "wilaya_id": 2,
    "code_postal": "213",
    "has_stop_desk": 0
  },
  "279": {
    "nom": "Beni Saf",
    "wilaya_id": 46,
    "code_postal": "4623",
    "has_stop_desk": 0
  },
  "280": {
    "nom": "Beni Slimane",
    "wilaya_id": 26,
    "code_postal": "2646",
    "has_stop_desk": 0
  },
  "281": {
    "nom": "Beni Smiel",
    "wilaya_id": 13,
    "code_postal": "1352",
    "has_stop_desk": 0
  },
  "282": {
    "nom": "Beni Snous",
    "wilaya_id": 13,
    "code_postal": "1317",
    "has_stop_desk": 0
  },
  "283": {
    "nom": "Beni Tamou",
    "wilaya_id": 9,
    "code_postal": "919",
    "has_stop_desk": 1
  },
  "284": {
    "nom": "Beni Yenni",
    "wilaya_id": 15,
    "code_postal": "1552",
    "has_stop_desk": 0
  },
  "285": {
    "nom": "Beni Zentis",
    "wilaya_id": 48,
    "code_postal": "4830",
    "has_stop_desk": 0
  },
  "286": {
    "nom": "Beni Zid",
    "wilaya_id": 21,
    "code_postal": "2111",
    "has_stop_desk": 0
  },
  "287": {
    "nom": "Beni Zikki",
    "wilaya_id": 15,
    "code_postal": "1546",
    "has_stop_desk": 0
  },
  "288": {
    "nom": "Beni Zmenzer",
    "wilaya_id": 15,
    "code_postal": "1516",
    "has_stop_desk": 0
  },
  "289": {
    "nom": "Benian",
    "wilaya_id": 29,
    "code_postal": "2919",
    "has_stop_desk": 0
  },
  "290": {
    "nom": "Benimaouche",
    "wilaya_id": 6,
    "code_postal": "650",
    "has_stop_desk": 0
  },
  "291": {
    "nom": "Benkhelil",
    "wilaya_id": 9,
    "code_postal": "910",
    "has_stop_desk": 1
  },
  "292": {
    "nom": "Bensekrane",
    "wilaya_id": 13,
    "code_postal": "1324",
    "has_stop_desk": 0
  },
  "293": {
    "nom": "Benyagoub",
    "wilaya_id": 17,
    "code_postal": "1727",
    "has_stop_desk": 0
  },
  "294": {
    "nom": "Benyahia Abderrahmane",
    "wilaya_id": 43,
    "code_postal": "4309",
    "has_stop_desk": 0
  },
  "295": {
    "nom": "Benzouh",
    "wilaya_id": 28,
    "code_postal": "2835",
    "has_stop_desk": 0
  },
  "296": {
    "nom": "Berhoum",
    "wilaya_id": 28,
    "code_postal": "2812",
    "has_stop_desk": 0
  },
  "297": {
    "nom": "Berrahel",
    "wilaya_id": 23,
    "code_postal": "2302",
    "has_stop_desk": 0
  },
  "298": {
    "nom": "Berriane",
    "wilaya_id": 47,
    "code_postal": "4704",
    "has_stop_desk": 0
  },
  "299": {
    "nom": "Berriche",
    "wilaya_id": 4,
    "code_postal": "409",
    "has_stop_desk": 0
  },
  "300": {
    "nom": "Berrihane",
    "wilaya_id": 36,
    "code_postal": "3610",
    "has_stop_desk": 0
  },
  "301": {
    "nom": "Berrouaghia",
    "wilaya_id": 26,
    "code_postal": "2647",
    "has_stop_desk": 0
  },
  "302": {
    "nom": "Besbes",
    "wilaya_id": 36,
    "code_postal": "3616",
    "has_stop_desk": 0
  },
  "303": {
    "nom": "Besbes",
    "wilaya_id": 51,
    "code_postal": "5103",
    "has_stop_desk": 0
  },
  "304": {
    "nom": "Bethioua",
    "wilaya_id": 31,
    "code_postal": "3107",
    "has_stop_desk": 0
  },
  "305": {
    "nom": "Bin El Ouiden",
    "wilaya_id": 21,
    "code_postal": "2129",
    "has_stop_desk": 0
  },
  "306": {
    "nom": "Bir Ben Laabed",
    "wilaya_id": 26,
    "code_postal": "2656",
    "has_stop_desk": 0
  },
  "307": {
    "nom": "Bir Bouhouche",
    "wilaya_id": 41,
    "code_postal": "4114",
    "has_stop_desk": 0
  },
  "308": {
    "nom": "Bir Chouhada",
    "wilaya_id": 4,
    "code_postal": "421",
    "has_stop_desk": 0
  },
  "309": {
    "nom": "Bir Dheheb",
    "wilaya_id": 12,
    "code_postal": "1214",
    "has_stop_desk": 0
  },
  "310": {
    "nom": "Bir El Arch",
    "wilaya_id": 19,
    "code_postal": "1908",
    "has_stop_desk": 0
  },
  "311": {
    "nom": "Bir El Ater",
    "wilaya_id": 12,
    "code_postal": "1202",
    "has_stop_desk": 0
  },
  "312": {
    "nom": "Bir El Djir",
    "wilaya_id": 31,
    "code_postal": "3103",
    "has_stop_desk": 0
  },
  "313": {
    "nom": "Bir El Hammam",
    "wilaya_id": 22,
    "code_postal": "2248",
    "has_stop_desk": 0
  },
  "314": {
    "nom": "Bir Foda",
    "wilaya_id": 28,
    "code_postal": "2836",
    "has_stop_desk": 0
  },
  "315": {
    "nom": "Bir Ghbalou",
    "wilaya_id": 10,
    "code_postal": "1036",
    "has_stop_desk": 0
  },
  "316": {
    "nom": "Bir Haddada",
    "wilaya_id": 19,
    "code_postal": "1934",
    "has_stop_desk": 0
  },
  "317": {
    "nom": "Bir Kasdali",
    "wilaya_id": 34,
    "code_postal": "3431",
    "has_stop_desk": 0
  },
  "318": {
    "nom": "Bir Mokkadem",
    "wilaya_id": 12,
    "code_postal": "1210",
    "has_stop_desk": 0
  },
  "319": {
    "nom": "Bir Mourad Rais",
    "wilaya_id": 16,
    "code_postal": "1609",
    "has_stop_desk": 1
  },
  "320": {
    "nom": "Bir Ould Khelifa",
    "wilaya_id": 44,
    "code_postal": "4419",
    "has_stop_desk": 0
  },
  "321": {
    "nom": "Bir Touta",
    "wilaya_id": 16,
    "code_postal": "1636",
    "has_stop_desk": 1
  },
  "322": {
    "nom": "Birine",
    "wilaya_id": 17,
    "code_postal": "1708",
    "has_stop_desk": 0
  },
  "323": {
    "nom": "Birkhadem",
    "wilaya_id": 16,
    "code_postal": "1612",
    "has_stop_desk": 1
  },
  "324": {
    "nom": "Biskra",
    "wilaya_id": 7,
    "code_postal": "701",
    "has_stop_desk": 0
  },
  "325": {
    "nom": "Bitam",
    "wilaya_id": 5,
    "code_postal": "514",
    "has_stop_desk": 0
  },
  "326": {
    "nom": "Blida",
    "wilaya_id": 9,
    "code_postal": "901",
    "has_stop_desk": 1
  },
  "327": {
    "nom": "Blidet Amor",
    "wilaya_id": 55,
    "code_postal": "5502",
    "has_stop_desk": 0
  },
  "328": {
    "nom": "Boghar",
    "wilaya_id": 26,
    "code_postal": "2625",
    "has_stop_desk": 0
  },
  "329": {
    "nom": "Boghni",
    "wilaya_id": 15,
    "code_postal": "1540",
    "has_stop_desk": 0
  },
  "330": {
    "nom": "Bologhine Ibnou Ziri",
    "wilaya_id": 16,
    "code_postal": "1606",
    "has_stop_desk": 1
  },
  "331": {
    "nom": "Bordj Badji Mokhtar",
    "wilaya_id": 50,
    "code_postal": "5001",
    "has_stop_desk": 0
  },
  "332": {
    "nom": "Bordj Ben Azzouz",
    "wilaya_id": 7,
    "code_postal": "727",
    "has_stop_desk": 0
  },
  "333": {
    "nom": "Bordj Bou Arreridj",
    "wilaya_id": 34,
    "code_postal": "3401",
    "has_stop_desk": 0
  },
  "334": {
    "nom": "Bordj Bounaama",
    "wilaya_id": 38,
    "code_postal": "3802",
    "has_stop_desk": 0
  },
  "335": {
    "nom": "Bordj El Bahri",
    "wilaya_id": 16,
    "code_postal": "1642",
    "has_stop_desk": 1
  },
  "336": {
    "nom": "Bordj El Emir Abdelkader",
    "wilaya_id": 38,
    "code_postal": "3809",
    "has_stop_desk": 0
  },
  "337": {
    "nom": "Bordj El Haouasse",
    "wilaya_id": 56,
    "code_postal": "5602",
    "has_stop_desk": 0
  },
  "338": {
    "nom": "Bordj El Kiffan",
    "wilaya_id": 16,
    "code_postal": "1630",
    "has_stop_desk": 1
  },
  "339": {
    "nom": "Bordj Emir Khaled",
    "wilaya_id": 44,
    "code_postal": "4422",
    "has_stop_desk": 0
  },
  "340": {
    "nom": "Bordj Ghdir",
    "wilaya_id": 34,
    "code_postal": "3409",
    "has_stop_desk": 0
  },
  "341": {
    "nom": "Bordj Menaiel",
    "wilaya_id": 35,
    "code_postal": "3504",
    "has_stop_desk": 0
  },
  "342": {
    "nom": "Bordj Okhriss",
    "wilaya_id": 10,
    "code_postal": "1018",
    "has_stop_desk": 0
  },
  "343": {
    "nom": "Bordj Omar Driss",
    "wilaya_id": 33,
    "code_postal": "3304",
    "has_stop_desk": 0
  },
  "344": {
    "nom": "Bordj Sabat",
    "wilaya_id": 24,
    "code_postal": "2421",
    "has_stop_desk": 0
  },
  "345": {
    "nom": "Bordj Tahar",
    "wilaya_id": 18,
    "code_postal": "1826",
    "has_stop_desk": 0
  },
  "346": {
    "nom": "Bordj Zemora",
    "wilaya_id": 34,
    "code_postal": "3403",
    "has_stop_desk": 0
  },
  "347": {
    "nom": "Bou Caid",
    "wilaya_id": 38,
    "code_postal": "3821",
    "has_stop_desk": 0
  },
  "348": {
    "nom": "Bou Hachana",
    "wilaya_id": 24,
    "code_postal": "2417",
    "has_stop_desk": 0
  },
  "349": {
    "nom": "Bou Hamdane",
    "wilaya_id": 24,
    "code_postal": "2412",
    "has_stop_desk": 0
  },
  "350": {
    "nom": "Bou Haroun",
    "wilaya_id": 42,
    "code_postal": "4220",
    "has_stop_desk": 0
  },
  "351": {
    "nom": "Bou Henni",
    "wilaya_id": 29,
    "code_postal": "2937",
    "has_stop_desk": 0
  },
  "352": {
    "nom": "Bou Ismail",
    "wilaya_id": 42,
    "code_postal": "4218",
    "has_stop_desk": 0
  },
  "353": {
    "nom": "Bou Saada",
    "wilaya_id": 28,
    "code_postal": "2820",
    "has_stop_desk": 0
  },
  "354": {
    "nom": "Bouaiche",
    "wilaya_id": 26,
    "code_postal": "2610",
    "has_stop_desk": 0
  },
  "355": {
    "nom": "Bouaichoune",
    "wilaya_id": 26,
    "code_postal": "2659",
    "has_stop_desk": 0
  },
  "356": {
    "nom": "Boualem",
    "wilaya_id": 32,
    "code_postal": "3206",
    "has_stop_desk": 0
  },
  "357": {
    "nom": "Bouandas",
    "wilaya_id": 19,
    "code_postal": "1930",
    "has_stop_desk": 0
  },
  "358": {
    "nom": "Bouarfa",
    "wilaya_id": 9,
    "code_postal": "920",
    "has_stop_desk": 1
  },
  "359": {
    "nom": "Bouati Mahmoud",
    "wilaya_id": 24,
    "code_postal": "2403",
    "has_stop_desk": 0
  },
  "360": {
    "nom": "Bouchagroun",
    "wilaya_id": 7,
    "code_postal": "729",
    "has_stop_desk": 0
  },
  "361": {
    "nom": "Bouchegouf",
    "wilaya_id": 24,
    "code_postal": "2425",
    "has_stop_desk": 0
  },
  "362": {
    "nom": "Bouchetata",
    "wilaya_id": 21,
    "code_postal": "2134",
    "has_stop_desk": 0
  },
  "363": {
    "nom": "Bouchrahil",
    "wilaya_id": 26,
    "code_postal": "2621",
    "has_stop_desk": 0
  },
  "364": {
    "nom": "Bouda",
    "wilaya_id": 1,
    "code_postal": "122",
    "has_stop_desk": 0
  },
  "365": {
    "nom": "Bouderbala",
    "wilaya_id": 10,
    "code_postal": "1023",
    "has_stop_desk": 0
  },
  "366": {
    "nom": "Boudjebaa El Bordj",
    "wilaya_id": 22,
    "code_postal": "2238",
    "has_stop_desk": 0
  },
  "367": {
    "nom": "Boudjellil",
    "wilaya_id": 6,
    "code_postal": "652",
    "has_stop_desk": 0
  },
  "368": {
    "nom": "Boudjima",
    "wilaya_id": 15,
    "code_postal": "1555",
    "has_stop_desk": 0
  },
  "369": {
    "nom": "Boudouaou",
    "wilaya_id": 35,
    "code_postal": "3502",
    "has_stop_desk": 0
  },
  "370": {
    "nom": "Boudouaou El Bahri",
    "wilaya_id": 35,
    "code_postal": "3527",
    "has_stop_desk": 0
  },
  "371": {
    "nom": "Boudria Beniyadjis",
    "wilaya_id": 18,
    "code_postal": "1822",
    "has_stop_desk": 0
  },
  "372": {
    "nom": "Boufarik",
    "wilaya_id": 9,
    "code_postal": "916",
    "has_stop_desk": 1
  },
  "373": {
    "nom": "Boufatis",
    "wilaya_id": 31,
    "code_postal": "3114",
    "has_stop_desk": 0
  },
  "374": {
    "nom": "Bougaa",
    "wilaya_id": 19,
    "code_postal": "1943",
    "has_stop_desk": 0
  },
  "375": {
    "nom": "Bougara",
    "wilaya_id": 9,
    "code_postal": "922",
    "has_stop_desk": 1
  },
  "376": {
    "nom": "Bougara",
    "wilaya_id": 14,
    "code_postal": "1440",
    "has_stop_desk": 0
  },
  "377": {
    "nom": "Boughzoul",
    "wilaya_id": 26,
    "code_postal": "2651",
    "has_stop_desk": 0
  },
  "378": {
    "nom": "Bougous",
    "wilaya_id": 36,
    "code_postal": "3604",
    "has_stop_desk": 0
  },
  "379": {
    "nom": "Bougtoub",
    "wilaya_id": 32,
    "code_postal": "3210",
    "has_stop_desk": 0
  },
  "380": {
    "nom": "Bouguirat",
    "wilaya_id": 27,
    "code_postal": "2719",
    "has_stop_desk": 0
  },
  "381": {
    "nom": "Bouhadjar",
    "wilaya_id": 36,
    "code_postal": "3602",
    "has_stop_desk": 0
  },
  "382": {
    "nom": "Bouhamra Ahmed",
    "wilaya_id": 24,
    "code_postal": "2431",
    "has_stop_desk": 0
  },
  "383": {
    "nom": "Bouhamza",
    "wilaya_id": 6,
    "code_postal": "637",
    "has_stop_desk": 0
  },
  "384": {
    "nom": "Bouhanifia",
    "wilaya_id": 29,
    "code_postal": "2902",
    "has_stop_desk": 0
  },
  "385": {
    "nom": "Bouhatem",
    "wilaya_id": 43,
    "code_postal": "4314",
    "has_stop_desk": 0
  },
  "386": {
    "nom": "Bouhlou",
    "wilaya_id": 13,
    "code_postal": "1347",
    "has_stop_desk": 0
  },
  "387": {
    "nom": "Bouhmama",
    "wilaya_id": 40,
    "code_postal": "4008",
    "has_stop_desk": 0
  },
  "388": {
    "nom": "Bouihi",
    "wilaya_id": 13,
    "code_postal": "1343",
    "has_stop_desk": 0
  },
  "389": {
    "nom": "Bouinan",
    "wilaya_id": 9,
    "code_postal": "903",
    "has_stop_desk": 1
  },
  "390": {
    "nom": "Bouira",
    "wilaya_id": 10,
    "code_postal": "1001",
    "has_stop_desk": 0
  },
  "391": {
    "nom": "Bouira Lahdab",
    "wilaya_id": 17,
    "code_postal": "1709",
    "has_stop_desk": 0
  },
  "392": {
    "nom": "Boukadir",
    "wilaya_id": 2,
    "code_postal": "212",
    "has_stop_desk": 0
  },
  "393": {
    "nom": "Boukais",
    "wilaya_id": 8,
    "code_postal": "815",
    "has_stop_desk": 0
  },
  "394": {
    "nom": "Boukhadra",
    "wilaya_id": 12,
    "code_postal": "1218",
    "has_stop_desk": 0
  },
  "395": {
    "nom": "Boukhanafis",
    "wilaya_id": 22,
    "code_postal": "2207",
    "has_stop_desk": 0
  },
  "396": {
    "nom": "Boukhelifa",
    "wilaya_id": 6,
    "code_postal": "648",
    "has_stop_desk": 0
  },
  "397": {
    "nom": "Boukram",
    "wilaya_id": 10,
    "code_postal": "1034",
    "has_stop_desk": 0
  },
  "398": {
    "nom": "Boulhaf Dyr",
    "wilaya_id": 12,
    "code_postal": "1225",
    "has_stop_desk": 0
  },
  "399": {
    "nom": "Boulhilat",
    "wilaya_id": 5,
    "code_postal": "560",
    "has_stop_desk": 0
  },
  "400": {
    "nom": "Boumagueur",
    "wilaya_id": 5,
    "code_postal": "541",
    "has_stop_desk": 0
  },
  "401": {
    "nom": "Boumedfaa",
    "wilaya_id": 44,
    "code_postal": "4403",
    "has_stop_desk": 0
  },
  "402": {
    "nom": "Boumerdes",
    "wilaya_id": 35,
    "code_postal": "3501",
    "has_stop_desk": 0
  },
  "403": {
    "nom": "Boumia",
    "wilaya_id": 5,
    "code_postal": "559",
    "has_stop_desk": 0
  },
  "404": {
    "nom": "Bounouh",
    "wilaya_id": 15,
    "code_postal": "1512",
    "has_stop_desk": 0
  },
  "405": {
    "nom": "Bounoura",
    "wilaya_id": 47,
    "code_postal": "4710",
    "has_stop_desk": 0
  },
  "406": {
    "nom": "Bourached",
    "wilaya_id": 44,
    "code_postal": "4409",
    "has_stop_desk": 0
  },
  "407": {
    "nom": "Bouraoui Belhadef",
    "wilaya_id": 18,
    "code_postal": "1816",
    "has_stop_desk": 0
  },
  "408": {
    "nom": "Bourkika",
    "wilaya_id": 42,
    "code_postal": "4205",
    "has_stop_desk": 0
  },
  "409": {
    "nom": "Bourouba",
    "wilaya_id": 16,
    "code_postal": "1616",
    "has_stop_desk": 1
  },
  "410": {
    "nom": "Bousfer",
    "wilaya_id": 31,
    "code_postal": "3116",
    "has_stop_desk": 0
  },
  "411": {
    "nom": "Bouskene",
    "wilaya_id": 26,
    "code_postal": "2619",
    "has_stop_desk": 0
  },
  "412": {
    "nom": "Bousselam",
    "wilaya_id": 19,
    "code_postal": "1919",
    "has_stop_desk": 0
  },
  "413": {
    "nom": "Boussemghoun",
    "wilaya_id": 32,
    "code_postal": "3213",
    "has_stop_desk": 0
  },
  "414": {
    "nom": "Boussif Ouled Askeur",
    "wilaya_id": 18,
    "code_postal": "1819",
    "has_stop_desk": 0
  },
  "415": {
    "nom": "Boutaleb",
    "wilaya_id": 19,
    "code_postal": "1905",
    "has_stop_desk": 0
  },
  "416": {
    "nom": "Bouteldja",
    "wilaya_id": 36,
    "code_postal": "3608",
    "has_stop_desk": 0
  },
  "417": {
    "nom": "Bouti Sayeh",
    "wilaya_id": 28,
    "code_postal": "2831",
    "has_stop_desk": 0
  },
  "418": {
    "nom": "Boutlelis",
    "wilaya_id": 31,
    "code_postal": "3124",
    "has_stop_desk": 0
  },
  "419": {
    "nom": "Bouzareah",
    "wilaya_id": 16,
    "code_postal": "1611",
    "has_stop_desk": 1
  },
  "420": {
    "nom": "Bouzedjar",
    "wilaya_id": 46,
    "code_postal": "4605",
    "has_stop_desk": 0
  },
  "421": {
    "nom": "Bouzeghaia",
    "wilaya_id": 2,
    "code_postal": "231",
    "has_stop_desk": 0
  },
  "422": {
    "nom": "Bouzeguene",
    "wilaya_id": 15,
    "code_postal": "1534",
    "has_stop_desk": 0
  },
  "423": {
    "nom": "Bouzegza Keddara",
    "wilaya_id": 35,
    "code_postal": "3519",
    "has_stop_desk": 0
  },
  "424": {
    "nom": "Bouzina",
    "wilaya_id": 5,
    "code_postal": "535",
    "has_stop_desk": 0
  },
  "425": {
    "nom": "Branis",
    "wilaya_id": 7,
    "code_postal": "703",
    "has_stop_desk": 0
  },
  "426": {
    "nom": "Breira",
    "wilaya_id": 2,
    "code_postal": "234",
    "has_stop_desk": 0
  },
  "427": {
    "nom": "Brezina",
    "wilaya_id": 32,
    "code_postal": "3204",
    "has_stop_desk": 0
  },
  "428": {
    "nom": "Brida",
    "wilaya_id": 3,
    "code_postal": "313",
    "has_stop_desk": 0
  },
  "429": {
    "nom": "Casbah",
    "wilaya_id": 16,
    "code_postal": "1607",
    "has_stop_desk": 1
  },
  "430": {
    "nom": "Chaabat El Ham",
    "wilaya_id": 46,
    "code_postal": "4602",
    "has_stop_desk": 0
  },
  "431": {
    "nom": "Chabet El Ameur",
    "wilaya_id": 35,
    "code_postal": "3513",
    "has_stop_desk": 0
  },
  "432": {
    "nom": "Chabounia",
    "wilaya_id": 26,
    "code_postal": "2638",
    "has_stop_desk": 0
  },
  "433": {
    "nom": "Chahna",
    "wilaya_id": 18,
    "code_postal": "1808",
    "has_stop_desk": 0
  },
  "434": {
    "nom": "Chaiba",
    "wilaya_id": 42,
    "code_postal": "4212",
    "has_stop_desk": 0
  },
  "435": {
    "nom": "Chaiba",
    "wilaya_id": 51,
    "code_postal": "5106",
    "has_stop_desk": 0
  },
  "436": {
    "nom": "Charef",
    "wilaya_id": 17,
    "code_postal": "1726",
    "has_stop_desk": 0
  },
  "437": {
    "nom": "Charouine",
    "wilaya_id": 49,
    "code_postal": "4902",
    "has_stop_desk": 0
  },
  "438": {
    "nom": "Chebaita Mokhtar",
    "wilaya_id": 36,
    "code_postal": "3615",
    "has_stop_desk": 0
  },
  "439": {
    "nom": "Chebli",
    "wilaya_id": 9,
    "code_postal": "902",
    "has_stop_desk": 1
  },
  "440": {
    "nom": "Chefia",
    "wilaya_id": 36,
    "code_postal": "3612",
    "has_stop_desk": 0
  },
  "441": {
    "nom": "Cheguig",
    "wilaya_id": 32,
    "code_postal": "3217",
    "has_stop_desk": 0
  },
  "442": {
    "nom": "Chehaima",
    "wilaya_id": 14,
    "code_postal": "1436",
    "has_stop_desk": 0
  },
  "443": {
    "nom": "Chekfa",
    "wilaya_id": 18,
    "code_postal": "1807",
    "has_stop_desk": 0
  },
  "444": {
    "nom": "Chelalet El Adhaoura",
    "wilaya_id": 26,
    "code_postal": "2618",
    "has_stop_desk": 0
  },
  "445": {
    "nom": "Chelghoum Laid",
    "wilaya_id": 43,
    "code_postal": "4303",
    "has_stop_desk": 0
  },
  "446": {
    "nom": "Chelia",
    "wilaya_id": 40,
    "code_postal": "4021",
    "has_stop_desk": 0
  },
  "447": {
    "nom": "Chellal",
    "wilaya_id": 28,
    "code_postal": "2809",
    "has_stop_desk": 0
  },
  "448": {
    "nom": "Chellala",
    "wilaya_id": 32,
    "code_postal": "3214",
    "has_stop_desk": 0
  },
  "449": {
    "nom": "Chellata",
    "wilaya_id": 6,
    "code_postal": "605",
    "has_stop_desk": 0
  },
  "450": {
    "nom": "Chemini",
    "wilaya_id": 6,
    "code_postal": "629",
    "has_stop_desk": 0
  },
  "451": {
    "nom": "Chemora",
    "wilaya_id": 5,
    "code_postal": "536",
    "has_stop_desk": 0
  },
  "452": {
    "nom": "Cheniguel",
    "wilaya_id": 26,
    "code_postal": "2640",
    "has_stop_desk": 0
  },
  "453": {
    "nom": "Chentouf",
    "wilaya_id": 46,
    "code_postal": "4611",
    "has_stop_desk": 0
  },
  "454": {
    "nom": "Cheraga",
    "wilaya_id": 16,
    "code_postal": "1652",
    "has_stop_desk": 1
  },
  "455": {
    "nom": "Cheraia",
    "wilaya_id": 21,
    "code_postal": "2131",
    "has_stop_desk": 0
  },
  "456": {
    "nom": "Cherchar",
    "wilaya_id": 40,
    "code_postal": "4011",
    "has_stop_desk": 0
  },
  "457": {
    "nom": "Cherchell",
    "wilaya_id": 42,
    "code_postal": "4214",
    "has_stop_desk": 0
  },
  "458": {
    "nom": "Cheria",
    "wilaya_id": 12,
    "code_postal": "1203",
    "has_stop_desk": 0
  },
  "459": {
    "nom": "Chetaibi",
    "wilaya_id": 23,
    "code_postal": "2310",
    "has_stop_desk": 0
  },
  "460": {
    "nom": "Chetma",
    "wilaya_id": 7,
    "code_postal": "704",
    "has_stop_desk": 0
  },
  "461": {
    "nom": "Chetouane",
    "wilaya_id": 13,
    "code_postal": "1350",
    "has_stop_desk": 0
  },
  "462": {
    "nom": "Chetouane Belaila",
    "wilaya_id": 22,
    "code_postal": "2247",
    "has_stop_desk": 0
  },
  "463": {
    "nom": "Chettia",
    "wilaya_id": 2,
    "code_postal": "224",
    "has_stop_desk": 0
  },
  "464": {
    "nom": "Cheurfa",
    "wilaya_id": 23,
    "code_postal": "2307",
    "has_stop_desk": 0
  },
  "465": {
    "nom": "Chiffa",
    "wilaya_id": 9,
    "code_postal": "908",
    "has_stop_desk": 1
  },
  "466": {
    "nom": "Chigara",
    "wilaya_id": 43,
    "code_postal": "4332",
    "has_stop_desk": 0
  },
  "467": {
    "nom": "Chihani",
    "wilaya_id": 36,
    "code_postal": "3614",
    "has_stop_desk": 0
  },
  "468": {
    "nom": "Chir",
    "wilaya_id": 5,
    "code_postal": "552",
    "has_stop_desk": 0
  },
  "469": {
    "nom": "Chlef",
    "wilaya_id": 2,
    "code_postal": "201",
    "has_stop_desk": 0
  },
  "470": {
    "nom": "Chorfa",
    "wilaya_id": 10,
    "code_postal": "1017",
    "has_stop_desk": 0
  },
  "471": {
    "nom": "Chorfa",
    "wilaya_id": 29,
    "code_postal": "2943",
    "has_stop_desk": 0
  },
  "472": {
    "nom": "Chrea",
    "wilaya_id": 9,
    "code_postal": "906",
    "has_stop_desk": 1
  },
  "473": {
    "nom": "Colla",
    "wilaya_id": 34,
    "code_postal": "3425",
    "has_stop_desk": 0
  },
  "474": {
    "nom": "Collo",
    "wilaya_id": 21,
    "code_postal": "2110",
    "has_stop_desk": 0
  },
  "475": {
    "nom": "Constantine",
    "wilaya_id": 25,
    "code_postal": "2501",
    "has_stop_desk": 0
  },
  "476": {
    "nom": "Corso",
    "wilaya_id": 35,
    "code_postal": "3516",
    "has_stop_desk": 0
  },
  "477": {
    "nom": "Dahmouni",
    "wilaya_id": 14,
    "code_postal": "1413",
    "has_stop_desk": 0
  },
  "478": {
    "nom": "Dahouara",
    "wilaya_id": 24,
    "code_postal": "2409",
    "has_stop_desk": 0
  },
  "479": {
    "nom": "Dahra",
    "wilaya_id": 2,
    "code_postal": "217",
    "has_stop_desk": 0
  },
  "480": {
    "nom": "Damiat",
    "wilaya_id": 26,
    "code_postal": "2613",
    "has_stop_desk": 0
  },
  "481": {
    "nom": "Damous",
    "wilaya_id": 42,
    "code_postal": "4215",
    "has_stop_desk": 0
  },
  "482": {
    "nom": "Dar Ben Abdelah",
    "wilaya_id": 48,
    "code_postal": "4832",
    "has_stop_desk": 0
  },
  "483": {
    "nom": "Dar Chioukh",
    "wilaya_id": 17,
    "code_postal": "1725",
    "has_stop_desk": 0
  },
  "484": {
    "nom": "Dar El Beida",
    "wilaya_id": 16,
    "code_postal": "1620",
    "has_stop_desk": 1
  },
  "485": {
    "nom": "Dar Yaghmouracene",
    "wilaya_id": 13,
    "code_postal": "1319",
    "has_stop_desk": 0
  },
  "486": {
    "nom": "Darghina",
    "wilaya_id": 6,
    "code_postal": "620",
    "has_stop_desk": 0
  },
  "487": {
    "nom": "Debdeb",
    "wilaya_id": 33,
    "code_postal": "3303",
    "has_stop_desk": 0
  },
  "488": {
    "nom": "Debila",
    "wilaya_id": 39,
    "code_postal": "3911",
    "has_stop_desk": 0
  },
  "489": {
    "nom": "Dechmia",
    "wilaya_id": 10,
    "code_postal": "1031",
    "has_stop_desk": 0
  },
  "490": {
    "nom": "Dehahna",
    "wilaya_id": 28,
    "code_postal": "2830",
    "has_stop_desk": 0
  },
  "491": {
    "nom": "Dehamcha",
    "wilaya_id": 19,
    "code_postal": "1915",
    "has_stop_desk": 0
  },
  "492": {
    "nom": "Deldoul",
    "wilaya_id": 17,
    "code_postal": "1729",
    "has_stop_desk": 0
  },
  "493": {
    "nom": "Deldoul",
    "wilaya_id": 49,
    "code_postal": "4906",
    "has_stop_desk": 0
  },
  "494": {
    "nom": "Dellys",
    "wilaya_id": 35,
    "code_postal": "3523",
    "has_stop_desk": 0
  },
  "495": {
    "nom": "Dely Ibrahim",
    "wilaya_id": 16,
    "code_postal": "1623",
    "has_stop_desk": 1
  },
  "496": {
    "nom": "Derrag",
    "wilaya_id": 26,
    "code_postal": "2608",
    "has_stop_desk": 0
  },
  "497": {
    "nom": "Derrahi Bousselah",
    "wilaya_id": 43,
    "code_postal": "4320",
    "has_stop_desk": 0
  },
  "498": {
    "nom": "Deux Bassins",
    "wilaya_id": 26,
    "code_postal": "2653",
    "has_stop_desk": 0
  },
  "499": {
    "nom": "Dhala",
    "wilaya_id": 4,
    "code_postal": "411",
    "has_stop_desk": 0
  },
  "500": {
    "nom": "Dhaya",
    "wilaya_id": 22,
    "code_postal": "2232",
    "has_stop_desk": 0
  },
  "501": {
    "nom": "Dhayet Bendhahoua",
    "wilaya_id": 47,
    "code_postal": "4703",
    "has_stop_desk": 0
  },
  "502": {
    "nom": "Didouche Mourad",
    "wilaya_id": 25,
    "code_postal": "2505",
    "has_stop_desk": 0
  },
  "503": {
    "nom": "Dirah",
    "wilaya_id": 10,
    "code_postal": "1007",
    "has_stop_desk": 0
  },
  "504": {
    "nom": "Djaafra",
    "wilaya_id": 34,
    "code_postal": "3415",
    "has_stop_desk": 0
  },
  "505": {
    "nom": "Djamaa",
    "wilaya_id": 57,
    "code_postal": "5706",
    "has_stop_desk": 0
  },
  "506": {
    "nom": "Djanet",
    "wilaya_id": 56,
    "code_postal": "5601",
    "has_stop_desk": 0
  },
  "507": {
    "nom": "Djasr Kasentina",
    "wilaya_id": 16,
    "code_postal": "1626",
    "has_stop_desk": 1
  },
  "508": {
    "nom": "Djebabra",
    "wilaya_id": 9,
    "code_postal": "925",
    "has_stop_desk": 1
  },
  "509": {
    "nom": "Djebahia",
    "wilaya_id": 10,
    "code_postal": "1026",
    "has_stop_desk": 0
  },
  "510": {
    "nom": "Djebala",
    "wilaya_id": 13,
    "code_postal": "1309",
    "has_stop_desk": 0
  },
  "511": {
    "nom": "Djeballah Khemissi",
    "wilaya_id": 24,
    "code_postal": "2434",
    "has_stop_desk": 0
  },
  "512": {
    "nom": "Djebel Aissa Mimoun",
    "wilaya_id": 15,
    "code_postal": "1539",
    "has_stop_desk": 0
  },
  "513": {
    "nom": "Djebel Messaad",
    "wilaya_id": 28,
    "code_postal": "2847",
    "has_stop_desk": 0
  },
  "514": {
    "nom": "Djebilet Rosfa",
    "wilaya_id": 14,
    "code_postal": "1419",
    "has_stop_desk": 0
  },
  "515": {
    "nom": "Djelfa",
    "wilaya_id": 17,
    "code_postal": "1701",
    "has_stop_desk": 0
  },
  "516": {
    "nom": "Djelida",
    "wilaya_id": 44,
    "code_postal": "4407",
    "has_stop_desk": 0
  },
  "517": {
    "nom": "Djellal",
    "wilaya_id": 40,
    "code_postal": "4012",
    "has_stop_desk": 0
  },
  "518": {
    "nom": "Djemaa Beni Habibi",
    "wilaya_id": 18,
    "code_postal": "1825",
    "has_stop_desk": 0
  },
  "519": {
    "nom": "Djemaa Ouled Cheikh",
    "wilaya_id": 44,
    "code_postal": "4429",
    "has_stop_desk": 0
  },
  "520": {
    "nom": "Djemila",
    "wilaya_id": 19,
    "code_postal": "1921",
    "has_stop_desk": 0
  },
  "521": {
    "nom": "Djemorah",
    "wilaya_id": 7,
    "code_postal": "720",
    "has_stop_desk": 0
  },
  "522": {
    "nom": "Djendel",
    "wilaya_id": 44,
    "code_postal": "4412",
    "has_stop_desk": 0
  },
  "523": {
    "nom": "Djendel Saadi Mohamed",
    "wilaya_id": 21,
    "code_postal": "2105",
    "has_stop_desk": 0
  },
  "524": {
    "nom": "Djeniane Bourzeg",
    "wilaya_id": 45,
    "code_postal": "4508",
    "has_stop_desk": 0
  },
  "525": {
    "nom": "Djerma",
    "wilaya_id": 5,
    "code_postal": "513",
    "has_stop_desk": 0
  },
  "526": {
    "nom": "Djezzar",
    "wilaya_id": 5,
    "code_postal": "543",
    "has_stop_desk": 0
  },
  "527": {
    "nom": "Djidiouia",
    "wilaya_id": 48,
    "code_postal": "4814",
    "has_stop_desk": 0
  },
  "528": {
    "nom": "Djillali Ben Amar",
    "wilaya_id": 14,
    "code_postal": "1424",
    "has_stop_desk": 0
  },
  "529": {
    "nom": "Djimla",
    "wilaya_id": 18,
    "code_postal": "1817",
    "has_stop_desk": 0
  },
  "530": {
    "nom": "Djinet",
    "wilaya_id": 35,
    "code_postal": "3508",
    "has_stop_desk": 0
  },
  "531": {
    "nom": "Djouab",
    "wilaya_id": 26,
    "code_postal": "2637",
    "has_stop_desk": 0
  },
  "532": {
    "nom": "Douaouda",
    "wilaya_id": 42,
    "code_postal": "4204",
    "has_stop_desk": 0
  },
  "533": {
    "nom": "Douar El Maa",
    "wilaya_id": 39,
    "code_postal": "3915",
    "has_stop_desk": 0
  },
  "534": {
    "nom": "Doucen",
    "wilaya_id": 51,
    "code_postal": "5105",
    "has_stop_desk": 0
  },
  "535": {
    "nom": "Doui Thabet",
    "wilaya_id": 20,
    "code_postal": "2002",
    "has_stop_desk": 0
  },
  "536": {
    "nom": "Douira",
    "wilaya_id": 16,
    "code_postal": "1648",
    "has_stop_desk": 1
  },
  "537": {
    "nom": "Douis",
    "wilaya_id": 17,
    "code_postal": "1715",
    "has_stop_desk": 0
  },
  "538": {
    "nom": "Dra El Caid",
    "wilaya_id": 6,
    "code_postal": "645",
    "has_stop_desk": 0
  },
  "539": {
    "nom": "Draa Ben Khedda",
    "wilaya_id": 15,
    "code_postal": "1547",
    "has_stop_desk": 0
  },
  "540": {
    "nom": "Draa El Mizan",
    "wilaya_id": 15,
    "code_postal": "1510",
    "has_stop_desk": 0
  },
  "541": {
    "nom": "Draa Essamar",
    "wilaya_id": 26,
    "code_postal": "2654",
    "has_stop_desk": 0
  },
  "542": {
    "nom": "Draa Kebila",
    "wilaya_id": 19,
    "code_postal": "1907",
    "has_stop_desk": 0
  },
  "543": {
    "nom": "Draria",
    "wilaya_id": 16,
    "code_postal": "1649",
    "has_stop_desk": 1
  },
  "544": {
    "nom": "Drea",
    "wilaya_id": 41,
    "code_postal": "4109",
    "has_stop_desk": 0
  },
  "545": {
    "nom": "Drean",
    "wilaya_id": 36,
    "code_postal": "3613",
    "has_stop_desk": 0
  },
  "546": {
    "nom": "Echatt",
    "wilaya_id": 36,
    "code_postal": "3618",
    "has_stop_desk": 0
  },
  "547": {
    "nom": "El Abadia",
    "wilaya_id": 44,
    "code_postal": "4411",
    "has_stop_desk": 0
  },
  "548": {
    "nom": "El Ach",
    "wilaya_id": 34,
    "code_postal": "3427",
    "has_stop_desk": 0
  },
  "549": {
    "nom": "El Achir",
    "wilaya_id": 34,
    "code_postal": "3407",
    "has_stop_desk": 0
  },
  "550": {
    "nom": "El Achour",
    "wilaya_id": 16,
    "code_postal": "1654",
    "has_stop_desk": 1
  },
  "551": {
    "nom": "El Adjiba",
    "wilaya_id": 10,
    "code_postal": "1019",
    "has_stop_desk": 0
  },
  "552": {
    "nom": "El Affroun",
    "wilaya_id": 9,
    "code_postal": "907",
    "has_stop_desk": 1
  },
  "553": {
    "nom": "El Aioun",
    "wilaya_id": 36,
    "code_postal": "3607",
    "has_stop_desk": 0
  },
  "554": {
    "nom": "El Alia",
    "wilaya_id": 55,
    "code_postal": "5513",
    "has_stop_desk": 0
  },
  "555": {
    "nom": "El Amiria",
    "wilaya_id": 4,
    "code_postal": "405",
    "has_stop_desk": 0
  },
  "556": {
    "nom": "El Amra",
    "wilaya_id": 44,
    "code_postal": "4408",
    "has_stop_desk": 0
  },
  "557": {
    "nom": "El Amria",
    "wilaya_id": 46,
    "code_postal": "4619",
    "has_stop_desk": 0
  },
  "558": {
    "nom": "El Ancar",
    "wilaya_id": 31,
    "code_postal": "3110",
    "has_stop_desk": 0
  },
  "559": {
    "nom": "El Ancer",
    "wilaya_id": 18,
    "code_postal": "1812",
    "has_stop_desk": 0
  },
  "560": {
    "nom": "El Anseur",
    "wilaya_id": 34,
    "code_postal": "3428",
    "has_stop_desk": 0
  },
  "561": {
    "nom": "El Aouana",
    "wilaya_id": 18,
    "code_postal": "1803",
    "has_stop_desk": 0
  },
  "562": {
    "nom": "El Aouinet",
    "wilaya_id": 12,
    "code_postal": "1205",
    "has_stop_desk": 0
  },
  "563": {
    "nom": "El Aricha",
    "wilaya_id": 13,
    "code_postal": "1332",
    "has_stop_desk": 0
  },
  "564": {
    "nom": "El Arrouch",
    "wilaya_id": 21,
    "code_postal": "2116",
    "has_stop_desk": 0
  },
  "565": {
    "nom": "El Asnam",
    "wilaya_id": 10,
    "code_postal": "1002",
    "has_stop_desk": 0
  },
  "566": {
    "nom": "El Assafia",
    "wilaya_id": 3,
    "code_postal": "320",
    "has_stop_desk": 0
  },
  "567": {
    "nom": "El Attaf",
    "wilaya_id": 44,
    "code_postal": "4410",
    "has_stop_desk": 0
  },
  "568": {
    "nom": "El Atteuf",
    "wilaya_id": 47,
    "code_postal": "4707",
    "has_stop_desk": 0
  },
  "569": {
    "nom": "El Azizia",
    "wilaya_id": 26,
    "code_postal": "2636",
    "has_stop_desk": 0
  },
  "570": {
    "nom": "El Bayadh",
    "wilaya_id": 32,
    "code_postal": "3201",
    "has_stop_desk": 0
  },
  "571": {
    "nom": "El Belala",
    "wilaya_id": 4,
    "code_postal": "407",
    "has_stop_desk": 0
  },
  "572": {
    "nom": "El Biar",
    "wilaya_id": 16,
    "code_postal": "1610",
    "has_stop_desk": 1
  },
  "573": {
    "nom": "El Biod",
    "wilaya_id": 45,
    "code_postal": "4512",
    "has_stop_desk": 0
  },
  "574": {
    "nom": "El Biodh Sidi Cheikh",
    "wilaya_id": 32,
    "code_postal": "3207",
    "has_stop_desk": 0
  },
  "575": {
    "nom": "El Bnoud",
    "wilaya_id": 32,
    "code_postal": "3216",
    "has_stop_desk": 0
  },
  "576": {
    "nom": "El Bordj",
    "wilaya_id": 29,
    "code_postal": "2917",
    "has_stop_desk": 0
  },
  "577": {
    "nom": "El Borma",
    "wilaya_id": 30,
    "code_postal": "3021",
    "has_stop_desk": 0
  },
  "578": {
    "nom": "El Bouni",
    "wilaya_id": 23,
    "code_postal": "2305",
    "has_stop_desk": 0
  },
  "579": {
    "nom": "El Braya",
    "wilaya_id": 31,
    "code_postal": "3118",
    "has_stop_desk": 0
  },
  "580": {
    "nom": "El Djazia",
    "wilaya_id": 4,
    "code_postal": "414",
    "has_stop_desk": 0
  },
  "581": {
    "nom": "El Eulma",
    "wilaya_id": 19,
    "code_postal": "1920",
    "has_stop_desk": 0
  },
  "582": {
    "nom": "El Fedjoudj",
    "wilaya_id": 24,
    "code_postal": "2420",
    "has_stop_desk": 0
  },
  "583": {
    "nom": "El Fedjoudj Boughrara Sa",
    "wilaya_id": 4,
    "code_postal": "419",
    "has_stop_desk": 0
  },
  "584": {
    "nom": "El Fehoul",
    "wilaya_id": 13,
    "code_postal": "1305",
    "has_stop_desk": 0
  },
  "585": {
    "nom": "El Feidh",
    "wilaya_id": 7,
    "code_postal": "716",
    "has_stop_desk": 0
  },
  "586": {
    "nom": "El Gaada",
    "wilaya_id": 29,
    "code_postal": "2929",
    "has_stop_desk": 0
  },
  "587": {
    "nom": "El Ghedir",
    "wilaya_id": 21,
    "code_postal": "2133",
    "has_stop_desk": 0
  },
  "588": {
    "nom": "El Ghicha",
    "wilaya_id": 3,
    "code_postal": "314",
    "has_stop_desk": 0
  },
  "589": {
    "nom": "El Ghomri",
    "wilaya_id": 29,
    "code_postal": "2934",
    "has_stop_desk": 0
  },
  "590": {
    "nom": "El Ghrous",
    "wilaya_id": 7,
    "code_postal": "731",
    "has_stop_desk": 0
  },
  "591": {
    "nom": "El Gor",
    "wilaya_id": 13,
    "code_postal": "1310",
    "has_stop_desk": 0
  },
  "592": {
    "nom": "El Guedid",
    "wilaya_id": 17,
    "code_postal": "1703",
    "has_stop_desk": 0
  },
  "593": {
    "nom": "El Gueitena",
    "wilaya_id": 29,
    "code_postal": "2938",
    "has_stop_desk": 0
  },
  "594": {
    "nom": "El Guelbelkebir",
    "wilaya_id": 26,
    "code_postal": "2609",
    "has_stop_desk": 0
  },
  "595": {
    "nom": "El Guerrara",
    "wilaya_id": 47,
    "code_postal": "4706",
    "has_stop_desk": 0
  },
  "596": {
    "nom": "El Guettar",
    "wilaya_id": 48,
    "code_postal": "4815",
    "has_stop_desk": 0
  },
  "597": {
    "nom": "El H'madna",
    "wilaya_id": 48,
    "code_postal": "4807",
    "has_stop_desk": 0
  },
  "598": {
    "nom": "El Hacaiba",
    "wilaya_id": 22,
    "code_postal": "2219",
    "has_stop_desk": 0
  },
  "599": {
    "nom": "El Hachem",
    "wilaya_id": 29,
    "code_postal": "2907",
    "has_stop_desk": 0
  },
  "600": {
    "nom": "El Hachimia",
    "wilaya_id": 10,
    "code_postal": "1015",
    "has_stop_desk": 0
  },
  "601": {
    "nom": "El Hadaiek",
    "wilaya_id": 21,
    "code_postal": "2103",
    "has_stop_desk": 0
  },
  "602": {
    "nom": "El Hadjab",
    "wilaya_id": 7,
    "code_postal": "732",
    "has_stop_desk": 0
  },
  "603": {
    "nom": "El Hadjadj",
    "wilaya_id": 2,
    "code_postal": "227",
    "has_stop_desk": 0
  },
  "604": {
    "nom": "El Hadjar",
    "wilaya_id": 23,
    "code_postal": "2303",
    "has_stop_desk": 0
  },
  "605": {
    "nom": "El Hadjira",
    "wilaya_id": 55,
    "code_postal": "5507",
    "has_stop_desk": 0
  },
  "606": {
    "nom": "El Hakimia",
    "wilaya_id": 10,
    "code_postal": "1020",
    "has_stop_desk": 0
  },
  "607": {
    "nom": "El Hamadia",
    "wilaya_id": 34,
    "code_postal": "3411",
    "has_stop_desk": 0
  },
  "608": {
    "nom": "El Hamdania",
    "wilaya_id": 26,
    "code_postal": "2616",
    "has_stop_desk": 0
  },
  "609": {
    "nom": "El Hamel",
    "wilaya_id": 28,
    "code_postal": "2827",
    "has_stop_desk": 0
  },
  "610": {
    "nom": "El Hamma",
    "wilaya_id": 40,
    "code_postal": "4005",
    "has_stop_desk": 0
  },
  "611": {
    "nom": "El Haouaita",
    "wilaya_id": 3,
    "code_postal": "323",
    "has_stop_desk": 0
  },
  "612": {
    "nom": "El Haouch",
    "wilaya_id": 7,
    "code_postal": "713",
    "has_stop_desk": 0
  },
  "613": {
    "nom": "El Harmilia",
    "wilaya_id": 4,
    "code_postal": "429",
    "has_stop_desk": 0
  },
  "614": {
    "nom": "El Harrach",
    "wilaya_id": 16,
    "code_postal": "1613",
    "has_stop_desk": 1
  },
  "615": {
    "nom": "El Hassasna",
    "wilaya_id": 20,
    "code_postal": "2010",
    "has_stop_desk": 0
  },
  "616": {
    "nom": "El Hassi",
    "wilaya_id": 5,
    "code_postal": "557",
    "has_stop_desk": 0
  },
  "617": {
    "nom": "El Hassi",
    "wilaya_id": 48,
    "code_postal": "4833",
    "has_stop_desk": 0
  },
  "618": {
    "nom": "El Houamed",
    "wilaya_id": 28,
    "code_postal": "2826",
    "has_stop_desk": 0
  },
  "619": {
    "nom": "El Houidjbet",
    "wilaya_id": 12,
    "code_postal": "1206",
    "has_stop_desk": 0
  },
  "620": {
    "nom": "El Idrissia",
    "wilaya_id": 17,
    "code_postal": "1714",
    "has_stop_desk": 0
  },
  "621": {
    "nom": "El Kala",
    "wilaya_id": 36,
    "code_postal": "3605",
    "has_stop_desk": 0
  },
  "622": {
    "nom": "El Kantara",
    "wilaya_id": 7,
    "code_postal": "717",
    "has_stop_desk": 0
  },
  "623": {
    "nom": "El Karimia",
    "wilaya_id": 2,
    "code_postal": "204",
    "has_stop_desk": 0
  },
  "624": {
    "nom": "El Kennar Nouchfi",
    "wilaya_id": 18,
    "code_postal": "1820",
    "has_stop_desk": 0
  },
  "625": {
    "nom": "El Kerma",
    "wilaya_id": 31,
    "code_postal": "3117",
    "has_stop_desk": 0
  },
  "626": {
    "nom": "El Keurt",
    "wilaya_id": 29,
    "code_postal": "2940",
    "has_stop_desk": 0
  },
  "627": {
    "nom": "El Khabouzia",
    "wilaya_id": 10,
    "code_postal": "1021",
    "has_stop_desk": 0
  },
  "628": {
    "nom": "El Kharrouba",
    "wilaya_id": 35,
    "code_postal": "3532",
    "has_stop_desk": 0
  },
  "629": {
    "nom": "El Kheither",
    "wilaya_id": 32,
    "code_postal": "3211",
    "has_stop_desk": 0
  },
  "630": {
    "nom": "El Khemis",
    "wilaya_id": 17,
    "code_postal": "1711",
    "has_stop_desk": 0
  },
  "631": {
    "nom": "El Khroub",
    "wilaya_id": 25,
    "code_postal": "2506",
    "has_stop_desk": 0
  },
  "632": {
    "nom": "El Kouif",
    "wilaya_id": 12,
    "code_postal": "1211",
    "has_stop_desk": 0
  },
  "633": {
    "nom": "El Kseur",
    "wilaya_id": 6,
    "code_postal": "640",
    "has_stop_desk": 0
  },
  "634": {
    "nom": "El M'ghair",
    "wilaya_id": 57,
    "code_postal": "5701",
    "has_stop_desk": 0
  },
  "635": {
    "nom": "El M'hir",
    "wilaya_id": 34,
    "code_postal": "3405",
    "has_stop_desk": 0
  },
  "636": {
    "nom": "El Madania",
    "wilaya_id": 16,
    "code_postal": "1603",
    "has_stop_desk": 1
  },
  "637": {
    "nom": "El Madher",
    "wilaya_id": 5,
    "code_postal": "507",
    "has_stop_desk": 0
  },
  "638": {
    "nom": "El Magharia",
    "wilaya_id": 16,
    "code_postal": "1631",
    "has_stop_desk": 1
  },
  "639": {
    "nom": "El Mahmal",
    "wilaya_id": 40,
    "code_postal": "4017",
    "has_stop_desk": 0
  },
  "640": {
    "nom": "El Main",
    "wilaya_id": 34,
    "code_postal": "3416",
    "has_stop_desk": 0
  },
  "641": {
    "nom": "El Maine",
    "wilaya_id": 44,
    "code_postal": "4434",
    "has_stop_desk": 0
  },
  "642": {
    "nom": "El Malabiod",
    "wilaya_id": 12,
    "code_postal": "1220",
    "has_stop_desk": 0
  },
  "643": {
    "nom": "El Malah",
    "wilaya_id": 46,
    "code_postal": "4614",
    "has_stop_desk": 0
  },
  "644": {
    "nom": "El Mamounia",
    "wilaya_id": 29,
    "code_postal": "2939",
    "has_stop_desk": 0
  },
  "645": {
    "nom": "El Marsa",
    "wilaya_id": 2,
    "code_postal": "223",
    "has_stop_desk": 0
  },
  "646": {
    "nom": "El Marsa",
    "wilaya_id": 21,
    "code_postal": "2138",
    "has_stop_desk": 0
  },
  "647": {
    "nom": "El Matmar",
    "wilaya_id": 48,
    "code_postal": "4817",
    "has_stop_desk": 0
  },
  "648": {
    "nom": "El Mechira",
    "wilaya_id": 43,
    "code_postal": "4326",
    "has_stop_desk": 0
  },
  "649": {
    "nom": "El Mehara",
    "wilaya_id": 32,
    "code_postal": "3219",
    "has_stop_desk": 0
  },
  "650": {
    "nom": "El Menaouer",
    "wilaya_id": 29,
    "code_postal": "2921",
    "has_stop_desk": 0
  },
  "651": {
    "nom": "El Meniaa",
    "wilaya_id": 58,
    "code_postal": "5801",
    "has_stop_desk": 0
  },
  "652": {
    "nom": "El Meridj",
    "wilaya_id": 12,
    "code_postal": "1224",
    "has_stop_desk": 0
  },
  "653": {
    "nom": "El Merssa",
    "wilaya_id": 16,
    "code_postal": "1643",
    "has_stop_desk": 1
  },
  "654": {
    "nom": "El Messaid",
    "wilaya_id": 46,
    "code_postal": "4628",
    "has_stop_desk": 0
  },
  "655": {
    "nom": "El Mezeraa",
    "wilaya_id": 12,
    "code_postal": "1227",
    "has_stop_desk": 0
  },
  "656": {
    "nom": "El Milia",
    "wilaya_id": 18,
    "code_postal": "1809",
    "has_stop_desk": 0
  },
  "657": {
    "nom": "El Mokrani",
    "wilaya_id": 10,
    "code_postal": "1044",
    "has_stop_desk": 0
  },
  "658": {
    "nom": "El Mouradia",
    "wilaya_id": 16,
    "code_postal": "1627",
    "has_stop_desk": 1
  },
  "659": {
    "nom": "El Ogla",
    "wilaya_id": 12,
    "code_postal": "1213",
    "has_stop_desk": 0
  },
  "660": {
    "nom": "El Ogla",
    "wilaya_id": 39,
    "code_postal": "3925",
    "has_stop_desk": 0
  },
  "661": {
    "nom": "El Ogla El Malha",
    "wilaya_id": 12,
    "code_postal": "1215",
    "has_stop_desk": 0
  },
  "662": {
    "nom": "El Omaria",
    "wilaya_id": 26,
    "code_postal": "2607",
    "has_stop_desk": 0
  },
  "663": {
    "nom": "El Ouata",
    "wilaya_id": 52,
    "code_postal": "5207",
    "has_stop_desk": 0
  },
  "664": {
    "nom": "El Oued",
    "wilaya_id": 39,
    "code_postal": "3901",
    "has_stop_desk": 0
  },
  "665": {
    "nom": "El Oueldja",
    "wilaya_id": 40,
    "code_postal": "4009",
    "has_stop_desk": 0
  },
  "666": {
    "nom": "El Ouinet",
    "wilaya_id": 26,
    "code_postal": "2657",
    "has_stop_desk": 0
  },
  "667": {
    "nom": "El Ouldja",
    "wilaya_id": 19,
    "code_postal": "1959",
    "has_stop_desk": 0
  },
  "668": {
    "nom": "El Ouldja",
    "wilaya_id": 48,
    "code_postal": "4836",
    "has_stop_desk": 0
  },
  "669": {
    "nom": "El Ouricia",
    "wilaya_id": 19,
    "code_postal": "1937",
    "has_stop_desk": 0
  },
  "670": {
    "nom": "El Outaya",
    "wilaya_id": 7,
    "code_postal": "719",
    "has_stop_desk": 0
  },
  "671": {
    "nom": "El Tarf",
    "wilaya_id": 36,
    "code_postal": "3601",
    "has_stop_desk": 0
  },
  "672": {
    "nom": "Elayadi Barbes",
    "wilaya_id": 43,
    "code_postal": "4329",
    "has_stop_desk": 0
  },
  "673": {
    "nom": "Emir Abdelkader",
    "wilaya_id": 18,
    "code_postal": "1806",
    "has_stop_desk": 0
  },
  "674": {
    "nom": "Emir Abdelkader",
    "wilaya_id": 46,
    "code_postal": "4627",
    "has_stop_desk": 0
  },
  "675": {
    "nom": "Emjez Edchich",
    "wilaya_id": 21,
    "code_postal": "2120",
    "has_stop_desk": 0
  },
  "676": {
    "nom": "Ensigha",
    "wilaya_id": 40,
    "code_postal": "4015",
    "has_stop_desk": 0
  },
  "677": {
    "nom": "Erg Ferradj",
    "wilaya_id": 8,
    "code_postal": "802",
    "has_stop_desk": 0
  },
  "678": {
    "nom": "Erraguene",
    "wilaya_id": 18,
    "code_postal": "1802",
    "has_stop_desk": 0
  },
  "679": {
    "nom": "Es Sebt",
    "wilaya_id": 21,
    "code_postal": "2109",
    "has_stop_desk": 0
  },
  "680": {
    "nom": "Es Senia",
    "wilaya_id": 31,
    "code_postal": "3105",
    "has_stop_desk": 0
  },
  "681": {
    "nom": "Eulma",
    "wilaya_id": 23,
    "code_postal": "2304",
    "has_stop_desk": 0
  },
  "682": {
    "nom": "Faidh El Botma",
    "wilaya_id": 17,
    "code_postal": "1707",
    "has_stop_desk": 0
  },
  "683": {
    "nom": "Faidja",
    "wilaya_id": 14,
    "code_postal": "1441",
    "has_stop_desk": 0
  },
  "684": {
    "nom": "Fellaoucene",
    "wilaya_id": 13,
    "code_postal": "1320",
    "has_stop_desk": 0
  },
  "685": {
    "nom": "Fenaia Il Maten",
    "wilaya_id": 6,
    "code_postal": "618",
    "has_stop_desk": 0
  },
  "686": {
    "nom": "Fenoughil",
    "wilaya_id": 1,
    "code_postal": "115",
    "has_stop_desk": 0
  },
  "687": {
    "nom": "Feraoun",
    "wilaya_id": 6,
    "code_postal": "603",
    "has_stop_desk": 0
  },
  "688": {
    "nom": "Ferdjioua",
    "wilaya_id": 43,
    "code_postal": "4302",
    "has_stop_desk": 0
  },
  "689": {
    "nom": "Ferkane",
    "wilaya_id": 12,
    "code_postal": "1228",
    "has_stop_desk": 0
  },
  "690": {
    "nom": "Ferraguig",
    "wilaya_id": 29,
    "code_postal": "2933",
    "has_stop_desk": 0
  },
  "691": {
    "nom": "Fesdis",
    "wilaya_id": 5,
    "code_postal": "523",
    "has_stop_desk": 0
  },
  "692": {
    "nom": "Filfila",
    "wilaya_id": 21,
    "code_postal": "2130",
    "has_stop_desk": 0
  },
  "693": {
    "nom": "Fkirina",
    "wilaya_id": 4,
    "code_postal": "416",
    "has_stop_desk": 0
  },
  "694": {
    "nom": "Foggaret Azzaouia",
    "wilaya_id": 53,
    "code_postal": "5303",
    "has_stop_desk": 0
  },
  "695": {
    "nom": "Fornaka",
    "wilaya_id": 27,
    "code_postal": "2703",
    "has_stop_desk": 0
  },
  "696": {
    "nom": "Foughala",
    "wilaya_id": 7,
    "code_postal": "726",
    "has_stop_desk": 0
  },
  "697": {
    "nom": "Fouka",
    "wilaya_id": 42,
    "code_postal": "4217",
    "has_stop_desk": 0
  },
  "698": {
    "nom": "Foum Toub",
    "wilaya_id": 5,
    "code_postal": "531",
    "has_stop_desk": 0
  },
  "699": {
    "nom": "Freha",
    "wilaya_id": 15,
    "code_postal": "1504",
    "has_stop_desk": 0
  },
  "700": {
    "nom": "Frenda",
    "wilaya_id": 14,
    "code_postal": "1427",
    "has_stop_desk": 0
  },
  "701": {
    "nom": "Frikat",
    "wilaya_id": 15,
    "code_postal": "1514",
    "has_stop_desk": 0
  },
  "702": {
    "nom": "Froha",
    "wilaya_id": 29,
    "code_postal": "2913",
    "has_stop_desk": 0
  },
  "703": {
    "nom": "Gdyel",
    "wilaya_id": 31,
    "code_postal": "3102",
    "has_stop_desk": 0
  },
  "704": {
    "nom": "Ghardaia",
    "wilaya_id": 47,
    "code_postal": "4701",
    "has_stop_desk": 0
  },
  "705": {
    "nom": "Gharrous",
    "wilaya_id": 29,
    "code_postal": "2941",
    "has_stop_desk": 0
  },
  "706": {
    "nom": "Ghassira",
    "wilaya_id": 5,
    "code_postal": "502",
    "has_stop_desk": 0
  },
  "707": {
    "nom": "Ghassoul",
    "wilaya_id": 32,
    "code_postal": "3205",
    "has_stop_desk": 0
  },
  "708": {
    "nom": "Ghazaouet",
    "wilaya_id": 13,
    "code_postal": "1307",
    "has_stop_desk": 0
  },
  "709": {
    "nom": "Ghebala",
    "wilaya_id": 18,
    "code_postal": "1815",
    "has_stop_desk": 0
  },
  "710": {
    "nom": "Ghilassa",
    "wilaya_id": 34,
    "code_postal": "3432",
    "has_stop_desk": 0
  },
  "711": {
    "nom": "Ghriss",
    "wilaya_id": 29,
    "code_postal": "2912",
    "has_stop_desk": 0
  },
  "712": {
    "nom": "Gosbat",
    "wilaya_id": 5,
    "code_postal": "539",
    "has_stop_desk": 0
  },
  "713": {
    "nom": "Gouraya",
    "wilaya_id": 42,
    "code_postal": "4210",
    "has_stop_desk": 0
  },
  "714": {
    "nom": "Grarem Gouga",
    "wilaya_id": 43,
    "code_postal": "4317",
    "has_stop_desk": 0
  },
  "715": {
    "nom": "Guelaat Bou Sbaa",
    "wilaya_id": 24,
    "code_postal": "2418",
    "has_stop_desk": 0
  },
  "716": {
    "nom": "Guellal",
    "wilaya_id": 19,
    "code_postal": "1948",
    "has_stop_desk": 0
  },
  "717": {
    "nom": "Guelma",
    "wilaya_id": 24,
    "code_postal": "2401",
    "has_stop_desk": 0
  },
  "718": {
    "nom": "Guelta Zerka",
    "wilaya_id": 19,
    "code_postal": "1956",
    "has_stop_desk": 0
  },
  "719": {
    "nom": "Gueltat Sidi Saad",
    "wilaya_id": 3,
    "code_postal": "310",
    "has_stop_desk": 0
  },
  "720": {
    "nom": "Guemar",
    "wilaya_id": 39,
    "code_postal": "3906",
    "has_stop_desk": 0
  },
  "721": {
    "nom": "Guenzet",
    "wilaya_id": 19,
    "code_postal": "1941",
    "has_stop_desk": 0
  },
  "722": {
    "nom": "Guerdjoum",
    "wilaya_id": 29,
    "code_postal": "2942",
    "has_stop_desk": 0
  },
  "723": {
    "nom": "Guernini",
    "wilaya_id": 17,
    "code_postal": "1721",
    "has_stop_desk": 0
  },
  "724": {
    "nom": "Guerrouaou",
    "wilaya_id": 9,
    "code_postal": "923",
    "has_stop_desk": 1
  },
  "725": {
    "nom": "Guerrouma",
    "wilaya_id": 10,
    "code_postal": "1003",
    "has_stop_desk": 0
  },
  "726": {
    "nom": "Guertoufa",
    "wilaya_id": 14,
    "code_postal": "1422",
    "has_stop_desk": 0
  },
  "727": {
    "nom": "Guettara",
    "wilaya_id": 17,
    "code_postal": "1718",
    "has_stop_desk": 0
  },
  "728": {
    "nom": "Guidjel",
    "wilaya_id": 19,
    "code_postal": "1917",
    "has_stop_desk": 0
  },
  "729": {
    "nom": "Guigba",
    "wilaya_id": 5,
    "code_postal": "510",
    "has_stop_desk": 0
  },
  "730": {
    "nom": "Guorriguer",
    "wilaya_id": 12,
    "code_postal": "1216",
    "has_stop_desk": 0
  },
  "731": {
    "nom": "Hacine",
    "wilaya_id": 29,
    "code_postal": "2904",
    "has_stop_desk": 0
  },
  "732": {
    "nom": "Had Echkalla",
    "wilaya_id": 48,
    "code_postal": "4834",
    "has_stop_desk": 0
  },
  "733": {
    "nom": "Had Sahary",
    "wilaya_id": 17,
    "code_postal": "1720",
    "has_stop_desk": 0
  },
  "734": {
    "nom": "Haddada",
    "wilaya_id": 41,
    "code_postal": "4110",
    "has_stop_desk": 0
  },
  "735": {
    "nom": "Hadj Mechri",
    "wilaya_id": 3,
    "code_postal": "315",
    "has_stop_desk": 0
  },
  "736": {
    "nom": "Hadjadj",
    "wilaya_id": 27,
    "code_postal": "2714",
    "has_stop_desk": 0
  },
  "737": {
    "nom": "Hadjera Zerga",
    "wilaya_id": 10,
    "code_postal": "1042",
    "has_stop_desk": 0
  },
  "738": {
    "nom": "Hadjout",
    "wilaya_id": 42,
    "code_postal": "4208",
    "has_stop_desk": 0
  },
  "739": {
    "nom": "Hadjret Ennous",
    "wilaya_id": 42,
    "code_postal": "4228",
    "has_stop_desk": 0
  },
  "740": {
    "nom": "Haizer",
    "wilaya_id": 10,
    "code_postal": "1012",
    "has_stop_desk": 0
  },
  "741": {
    "nom": "Hamadi Krouma",
    "wilaya_id": 21,
    "code_postal": "2137",
    "has_stop_desk": 0
  },
  "742": {
    "nom": "Hamadia",
    "wilaya_id": 14,
    "code_postal": "1435",
    "has_stop_desk": 0
  },
  "743": {
    "nom": "Hamala",
    "wilaya_id": 43,
    "code_postal": "4324",
    "has_stop_desk": 0
  },
  "744": {
    "nom": "Hamam Debagh",
    "wilaya_id": 24,
    "code_postal": "2419",
    "has_stop_desk": 0
  },
  "745": {
    "nom": "Hamam Soukhna",
    "wilaya_id": 19,
    "code_postal": "1932",
    "has_stop_desk": 0
  },
  "746": {
    "nom": "Hamma",
    "wilaya_id": 19,
    "code_postal": "1911",
    "has_stop_desk": 0
  },
  "747": {
    "nom": "Hamma Bouziane",
    "wilaya_id": 25,
    "code_postal": "2502",
    "has_stop_desk": 0
  },
  "748": {
    "nom": "Hammam Beni Salah",
    "wilaya_id": 36,
    "code_postal": "3623",
    "has_stop_desk": 0
  },
  "749": {
    "nom": "Hammam Boughrara",
    "wilaya_id": 13,
    "code_postal": "1328",
    "has_stop_desk": 0
  },
  "750": {
    "nom": "Hammam Bouhadjar",
    "wilaya_id": 46,
    "code_postal": "4604",
    "has_stop_desk": 0
  },
  "751": {
    "nom": "Hammam Dalaa",
    "wilaya_id": 28,
    "code_postal": "2803",
    "has_stop_desk": 0
  },
  "752": {
    "nom": "Hammam Guergour",
    "wilaya_id": 19,
    "code_postal": "1950",
    "has_stop_desk": 0
  },
  "753": {
    "nom": "Hammam Melouane",
    "wilaya_id": 9,
    "code_postal": "909",
    "has_stop_desk": 1
  },
  "754": {
    "nom": "Hammam N'bail",
    "wilaya_id": 24,
    "code_postal": "2422",
    "has_stop_desk": 0
  },
  "755": {
    "nom": "Hammam Righa",
    "wilaya_id": 44,
    "code_postal": "4405",
    "has_stop_desk": 0
  },
  "756": {
    "nom": "Hammamet",
    "wilaya_id": 12,
    "code_postal": "1208",
    "has_stop_desk": 0
  },
  "757": {
    "nom": "Hammedi",
    "wilaya_id": 35,
    "code_postal": "3530",
    "has_stop_desk": 0
  },
  "758": {
    "nom": "Hamraia",
    "wilaya_id": 39,
    "code_postal": "3909",
    "has_stop_desk": 0
  },
  "759": {
    "nom": "Hamri",
    "wilaya_id": 48,
    "code_postal": "4816",
    "has_stop_desk": 0
  },
  "760": {
    "nom": "Hanchir Toumghani",
    "wilaya_id": 4,
    "code_postal": "413",
    "has_stop_desk": 0
  },
  "761": {
    "nom": "Hanencha",
    "wilaya_id": 41,
    "code_postal": "4103",
    "has_stop_desk": 0
  },
  "762": {
    "nom": "Hanif",
    "wilaya_id": 10,
    "code_postal": "1006",
    "has_stop_desk": 0
  },
  "763": {
    "nom": "Hannacha",
    "wilaya_id": 26,
    "code_postal": "2660",
    "has_stop_desk": 0
  },
  "764": {
    "nom": "Haraza",
    "wilaya_id": 34,
    "code_postal": "3434",
    "has_stop_desk": 0
  },
  "765": {
    "nom": "Harbil",
    "wilaya_id": 19,
    "code_postal": "1936",
    "has_stop_desk": 0
  },
  "766": {
    "nom": "Harchoun",
    "wilaya_id": 2,
    "code_postal": "209",
    "has_stop_desk": 0
  },
  "767": {
    "nom": "Hasnaoua",
    "wilaya_id": 34,
    "code_postal": "3419",
    "has_stop_desk": 0
  },
  "768": {
    "nom": "Hassani Abdelkrim",
    "wilaya_id": 39,
    "code_postal": "3912",
    "has_stop_desk": 0
  },
  "769": {
    "nom": "Hassania",
    "wilaya_id": 44,
    "code_postal": "4418",
    "has_stop_desk": 0
  },
  "770": {
    "nom": "Hassasna",
    "wilaya_id": 46,
    "code_postal": "4621",
    "has_stop_desk": 0
  },
  "771": {
    "nom": "Hassi Bahbah",
    "wilaya_id": 17,
    "code_postal": "1704",
    "has_stop_desk": 0
  },
  "772": {
    "nom": "Hassi Ben Abdellah",
    "wilaya_id": 30,
    "code_postal": "3012",
    "has_stop_desk": 0
  },
  "773": {
    "nom": "Hassi Ben Okba",
    "wilaya_id": 31,
    "code_postal": "3119",
    "has_stop_desk": 0
  },
  "774": {
    "nom": "Hassi Bounif",
    "wilaya_id": 31,
    "code_postal": "3104",
    "has_stop_desk": 0
  },
  "775": {
    "nom": "Hassi Dahou",
    "wilaya_id": 22,
    "code_postal": "2252",
    "has_stop_desk": 0
  },
  "776": {
    "nom": "Hassi Delaa",
    "wilaya_id": 3,
    "code_postal": "305",
    "has_stop_desk": 0
  },
  "777": {
    "nom": "Hassi El Euch",
    "wilaya_id": 17,
    "code_postal": "1716",
    "has_stop_desk": 0
  },
  "778": {
    "nom": "Hassi El Ghella",
    "wilaya_id": 46,
    "code_postal": "4620",
    "has_stop_desk": 0
  },
  "779": {
    "nom": "Hassi Fedoul",
    "wilaya_id": 17,
    "code_postal": "1733",
    "has_stop_desk": 0
  },
  "780": {
    "nom": "Hassi Fehal",
    "wilaya_id": 58,
    "code_postal": "5802",
    "has_stop_desk": 0
  },
  "781": {
    "nom": "Hassi Gara",
    "wilaya_id": 58,
    "code_postal": "5803",
    "has_stop_desk": 0
  },
  "782": {
    "nom": "Hassi Khalifa",
    "wilaya_id": 39,
    "code_postal": "3913",
    "has_stop_desk": 0
  },
  "783": {
    "nom": "Hassi Mameche",
    "wilaya_id": 27,
    "code_postal": "2706",
    "has_stop_desk": 0
  },
  "784": {
    "nom": "Hassi Mefsoukh",
    "wilaya_id": 31,
    "code_postal": "3121",
    "has_stop_desk": 0
  },
  "785": {
    "nom": "Hassi Messaoud",
    "wilaya_id": 30,
    "code_postal": "3004",
    "has_stop_desk": 0
  },
  "786": {
    "nom": "Hassi R'mel",
    "wilaya_id": 3,
    "code_postal": "306",
    "has_stop_desk": 0
  },
  "787": {
    "nom": "Hassi Zahana",
    "wilaya_id": 22,
    "code_postal": "2220",
    "has_stop_desk": 0
  },
  "788": {
    "nom": "Hassiane",
    "wilaya_id": 27,
    "code_postal": "2732",
    "has_stop_desk": 0
  },
  "789": {
    "nom": "Heliopolis",
    "wilaya_id": 24,
    "code_postal": "2426",
    "has_stop_desk": 0
  },
  "790": {
    "nom": "Hennaya",
    "wilaya_id": 13,
    "code_postal": "1326",
    "has_stop_desk": 0
  },
  "791": {
    "nom": "Herenfa",
    "wilaya_id": 2,
    "code_postal": "215",
    "has_stop_desk": 0
  },
  "792": {
    "nom": "Herraoua",
    "wilaya_id": 16,
    "code_postal": "1639",
    "has_stop_desk": 1
  },
  "793": {
    "nom": "Hidoussa",
    "wilaya_id": 5,
    "code_postal": "546",
    "has_stop_desk": 0
  },
  "794": {
    "nom": "Hoceinia",
    "wilaya_id": 44,
    "code_postal": "4427",
    "has_stop_desk": 0
  },
  "795": {
    "nom": "Honaine",
    "wilaya_id": 13,
    "code_postal": "1344",
    "has_stop_desk": 0
  },
  "796": {
    "nom": "Hounet",
    "wilaya_id": 20,
    "code_postal": "2007",
    "has_stop_desk": 0
  },
  "797": {
    "nom": "Hussein Dey",
    "wilaya_id": 16,
    "code_postal": "1617",
    "has_stop_desk": 1
  },
  "798": {
    "nom": "Hydra",
    "wilaya_id": 16,
    "code_postal": "1628",
    "has_stop_desk": 1
  },
  "799": {
    "nom": "Ibn Ziad",
    "wilaya_id": 25,
    "code_postal": "2512",
    "has_stop_desk": 0
  },
  "800": {
    "nom": "Iboudrarene",
    "wilaya_id": 15,
    "code_postal": "1560",
    "has_stop_desk": 0
  },
  "801": {
    "nom": "Ichmoul",
    "wilaya_id": 5,
    "code_postal": "530",
    "has_stop_desk": 0
  },
  "802": {
    "nom": "Idjeur",
    "wilaya_id": 15,
    "code_postal": "1549",
    "has_stop_desk": 0
  },
  "803": {
    "nom": "Idles",
    "wilaya_id": 11,
    "code_postal": "1105",
    "has_stop_desk": 0
  },
  "804": {
    "nom": "Iferhounene",
    "wilaya_id": 15,
    "code_postal": "1517",
    "has_stop_desk": 0
  },
  "805": {
    "nom": "Ifigha",
    "wilaya_id": 15,
    "code_postal": "1541",
    "has_stop_desk": 0
  },
  "806": {
    "nom": "Iflissen",
    "wilaya_id": 15,
    "code_postal": "1554",
    "has_stop_desk": 0
  },
  "807": {
    "nom": "Ighil Ali",
    "wilaya_id": 6,
    "code_postal": "617",
    "has_stop_desk": 0
  },
  "808": {
    "nom": "Ighram",
    "wilaya_id": 6,
    "code_postal": "615",
    "has_stop_desk": 0
  },
  "809": {
    "nom": "Igli",
    "wilaya_id": 52,
    "code_postal": "5205",
    "has_stop_desk": 0
  },
  "810": {
    "nom": "Illilten",
    "wilaya_id": 15,
    "code_postal": "1533",
    "has_stop_desk": 0
  },
  "811": {
    "nom": "Illizi",
    "wilaya_id": 33,
    "code_postal": "3301",
    "has_stop_desk": 0
  },
  "812": {
    "nom": "Illoula Oumalou",
    "wilaya_id": 15,
    "code_postal": "1519",
    "has_stop_desk": 0
  },
  "813": {
    "nom": "Imsouhal",
    "wilaya_id": 15,
    "code_postal": "1563",
    "has_stop_desk": 0
  },
  "814": {
    "nom": "In Amenas",
    "wilaya_id": 33,
    "code_postal": "3306",
    "has_stop_desk": 0
  },
  "815": {
    "nom": "In Ghar",
    "wilaya_id": 53,
    "code_postal": "5302",
    "has_stop_desk": 0
  },
  "816": {
    "nom": "In Guezzam",
    "wilaya_id": 54,
    "code_postal": "5401",
    "has_stop_desk": 0
  },
  "817": {
    "nom": "In Salah",
    "wilaya_id": 53,
    "code_postal": "5301",
    "has_stop_desk": 0
  },
  "818": {
    "nom": "In Zghmir",
    "wilaya_id": 1,
    "code_postal": "105",
    "has_stop_desk": 0
  },
  "819": {
    "nom": "Inoughissen",
    "wilaya_id": 5,
    "code_postal": "511",
    "has_stop_desk": 0
  },
  "820": {
    "nom": "Irdjen",
    "wilaya_id": 15,
    "code_postal": "1507",
    "has_stop_desk": 0
  },
  "821": {
    "nom": "Isser",
    "wilaya_id": 35,
    "code_postal": "3509",
    "has_stop_desk": 0
  },
  "822": {
    "nom": "Jijel",
    "wilaya_id": 18,
    "code_postal": "1801",
    "has_stop_desk": 0
  },
  "823": {
    "nom": "Kadiria",
    "wilaya_id": 10,
    "code_postal": "1005",
    "has_stop_desk": 0
  },
  "824": {
    "nom": "Kais",
    "wilaya_id": 40,
    "code_postal": "4003",
    "has_stop_desk": 0
  },
  "825": {
    "nom": "Kalaa",
    "wilaya_id": 48,
    "code_postal": "4823",
    "has_stop_desk": 0
  },
  "826": {
    "nom": "Kanoua",
    "wilaya_id": 21,
    "code_postal": "2132",
    "has_stop_desk": 0
  },
  "827": {
    "nom": "Kasdir",
    "wilaya_id": 45,
    "code_postal": "4511",
    "has_stop_desk": 0
  },
  "828": {
    "nom": "Kef El Ahmar",
    "wilaya_id": 32,
    "code_postal": "3212",
    "has_stop_desk": 0
  },
  "829": {
    "nom": "Kef Lakhdar",
    "wilaya_id": 26,
    "code_postal": "2617",
    "has_stop_desk": 0
  },
  "830": {
    "nom": "Kenadsa",
    "wilaya_id": 8,
    "code_postal": "810",
    "has_stop_desk": 0
  },
  "831": {
    "nom": "Kendira",
    "wilaya_id": 6,
    "code_postal": "613",
    "has_stop_desk": 0
  },
  "832": {
    "nom": "Kerkera",
    "wilaya_id": 21,
    "code_postal": "2112",
    "has_stop_desk": 0
  },
  "833": {
    "nom": "Kerzaz",
    "wilaya_id": 52,
    "code_postal": "5208",
    "has_stop_desk": 0
  },
  "834": {
    "nom": "Khadra",
    "wilaya_id": 27,
    "code_postal": "2718",
    "has_stop_desk": 0
  },
  "835": {
    "nom": "Khalouia",
    "wilaya_id": 29,
    "code_postal": "2920",
    "has_stop_desk": 0
  },
  "836": {
    "nom": "Khams Djouamaa",
    "wilaya_id": 26,
    "code_postal": "2663",
    "has_stop_desk": 0
  },
  "837": {
    "nom": "Khedara",
    "wilaya_id": 41,
    "code_postal": "4111",
    "has_stop_desk": 0
  },
  "838": {
    "nom": "Kheir Eddine",
    "wilaya_id": 27,
    "code_postal": "2711",
    "has_stop_desk": 0
  },
  "839": {
    "nom": "Khelil",
    "wilaya_id": 34,
    "code_postal": "3420",
    "has_stop_desk": 0
  },
  "840": {
    "nom": "Khemis El Khechna",
    "wilaya_id": 35,
    "code_postal": "3531",
    "has_stop_desk": 0
  },
  "841": {
    "nom": "Khemis Miliana",
    "wilaya_id": 44,
    "code_postal": "4404",
    "has_stop_desk": 0
  },
  "842": {
    "nom": "Khemissa",
    "wilaya_id": 41,
    "code_postal": "4123",
    "has_stop_desk": 0
  },
  "843": {
    "nom": "Khemisti",
    "wilaya_id": 38,
    "code_postal": "3811",
    "has_stop_desk": 0
  },
  "844": {
    "nom": "Khemisti",
    "wilaya_id": 42,
    "code_postal": "4206",
    "has_stop_desk": 0
  },
  "845": {
    "nom": "Khenag Mayoum",
    "wilaya_id": 21,
    "code_postal": "2136",
    "has_stop_desk": 0
  },
  "846": {
    "nom": "Khenchela",
    "wilaya_id": 40,
    "code_postal": "4001",
    "has_stop_desk": 0
  },
  "847": {
    "nom": "Kheneg",
    "wilaya_id": 3,
    "code_postal": "309",
    "has_stop_desk": 0
  },
  "848": {
    "nom": "Khenguet Sidi Nadji",
    "wilaya_id": 7,
    "code_postal": "733",
    "has_stop_desk": 0
  },
  "849": {
    "nom": "Kheraisia",
    "wilaya_id": 16,
    "code_postal": "1656",
    "has_stop_desk": 1
  },
  "850": {
    "nom": "Kherrata",
    "wilaya_id": 6,
    "code_postal": "644",
    "has_stop_desk": 0
  },
  "851": {
    "nom": "Khettouti Sed El Jir",
    "wilaya_id": 28,
    "code_postal": "2832",
    "has_stop_desk": 0
  },
  "852": {
    "nom": "Khezara",
    "wilaya_id": 24,
    "code_postal": "2415",
    "has_stop_desk": 0
  },
  "853": {
    "nom": "Khirane",
    "wilaya_id": 40,
    "code_postal": "4020",
    "has_stop_desk": 0
  },
  "854": {
    "nom": "Khiri Oued Adjoul",
    "wilaya_id": 18,
    "code_postal": "1823",
    "has_stop_desk": 0
  },
  "855": {
    "nom": "Khoubana",
    "wilaya_id": 28,
    "code_postal": "2807",
    "has_stop_desk": 0
  },
  "856": {
    "nom": "Kimmel",
    "wilaya_id": 5,
    "code_postal": "517",
    "has_stop_desk": 0
  },
  "857": {
    "nom": "Kolea",
    "wilaya_id": 42,
    "code_postal": "4224",
    "has_stop_desk": 0
  },
  "858": {
    "nom": "Kouas",
    "wilaya_id": 18,
    "code_postal": "1814",
    "has_stop_desk": 0
  },
  "859": {
    "nom": "Kouba",
    "wilaya_id": 16,
    "code_postal": "1618",
    "has_stop_desk": 1
  },
  "860": {
    "nom": "Kouinine",
    "wilaya_id": 39,
    "code_postal": "3907",
    "has_stop_desk": 0
  },
  "861": {
    "nom": "Krakda",
    "wilaya_id": 32,
    "code_postal": "3215",
    "has_stop_desk": 0
  },
  "862": {
    "nom": "Ksabi",
    "wilaya_id": 52,
    "code_postal": "5209",
    "has_stop_desk": 0
  },
  "863": {
    "nom": "Ksar Bellezma",
    "wilaya_id": 5,
    "code_postal": "528",
    "has_stop_desk": 0
  },
  "864": {
    "nom": "Ksar Chellala",
    "wilaya_id": 14,
    "code_postal": "1429",
    "has_stop_desk": 0
  },
  "865": {
    "nom": "Ksar El Abtal",
    "wilaya_id": 19,
    "code_postal": "1952",
    "has_stop_desk": 0
  },
  "866": {
    "nom": "Ksar El Boukhari",
    "wilaya_id": 26,
    "code_postal": "2635",
    "has_stop_desk": 0
  },
  "867": {
    "nom": "Ksar El Hirane",
    "wilaya_id": 3,
    "code_postal": "302",
    "has_stop_desk": 0
  },
  "868": {
    "nom": "Ksar Kaddour",
    "wilaya_id": 49,
    "code_postal": "4903",
    "has_stop_desk": 0
  },
  "869": {
    "nom": "Ksar Sbahi",
    "wilaya_id": 4,
    "code_postal": "422",
    "has_stop_desk": 0
  },
  "870": {
    "nom": "Ksour",
    "wilaya_id": 34,
    "code_postal": "3422",
    "has_stop_desk": 0
  },
  "871": {
    "nom": "Labiod Medjadja",
    "wilaya_id": 2,
    "code_postal": "228",
    "has_stop_desk": 0
  },
  "872": {
    "nom": "Lac Des Oiseaux",
    "wilaya_id": 36,
    "code_postal": "3611",
    "has_stop_desk": 0
  },
  "873": {
    "nom": "Laghouat",
    "wilaya_id": 3,
    "code_postal": "301",
    "has_stop_desk": 0
  },
  "874": {
    "nom": "Lahlef",
    "wilaya_id": 48,
    "code_postal": "4829",
    "has_stop_desk": 0
  },
  "875": {
    "nom": "Lahmar",
    "wilaya_id": 8,
    "code_postal": "806",
    "has_stop_desk": 0
  },
  "876": {
    "nom": "Lakhdaria",
    "wilaya_id": 10,
    "code_postal": "1013",
    "has_stop_desk": 0
  },
  "877": {
    "nom": "Lamtar",
    "wilaya_id": 22,
    "code_postal": "2234",
    "has_stop_desk": 0
  },
  "878": {
    "nom": "Larba Nath Irathen",
    "wilaya_id": 15,
    "code_postal": "1521",
    "has_stop_desk": 0
  },
  "879": {
    "nom": "Larbaa",
    "wilaya_id": 5,
    "code_postal": "561",
    "has_stop_desk": 0
  },
  "880": {
    "nom": "Larbaa",
    "wilaya_id": 9,
    "code_postal": "917",
    "has_stop_desk": 1
  },
  "881": {
    "nom": "Larbaa",
    "wilaya_id": 38,
    "code_postal": "3816",
    "has_stop_desk": 0
  },
  "882": {
    "nom": "Larbaa Nath Irathen",
    "wilaya_id": 15,
    "code_postal": "1568",
    "has_stop_desk": 0
  },
  "883": {
    "nom": "Larbatache",
    "wilaya_id": 35,
    "code_postal": "3518",
    "has_stop_desk": 0
  },
  "884": {
    "nom": "Lardjem",
    "wilaya_id": 38,
    "code_postal": "3806",
    "has_stop_desk": 0
  },
  "885": {
    "nom": "Larhat",
    "wilaya_id": 42,
    "code_postal": "4203",
    "has_stop_desk": 0
  },
  "886": {
    "nom": "Layoune",
    "wilaya_id": 38,
    "code_postal": "3810",
    "has_stop_desk": 0
  },
  "887": {
    "nom": "Lazharia",
    "wilaya_id": 38,
    "code_postal": "3804",
    "has_stop_desk": 0
  },
  "888": {
    "nom": "Lazrou",
    "wilaya_id": 5,
    "code_postal": "558",
    "has_stop_desk": 0
  },
  "889": {
    "nom": "Leflaye",
    "wilaya_id": 6,
    "code_postal": "643",
    "has_stop_desk": 0
  },
  "890": {
    "nom": "Leghata",
    "wilaya_id": 35,
    "code_postal": "3529",
    "has_stop_desk": 0
  },
  "891": {
    "nom": "Lemsane",
    "wilaya_id": 5,
    "code_postal": "527",
    "has_stop_desk": 0
  },
  "892": {
    "nom": "Les Eucalyptus",
    "wilaya_id": 16,
    "code_postal": "1633",
    "has_stop_desk": 1
  },
  "893": {
    "nom": "Lichana",
    "wilaya_id": 7,
    "code_postal": "723",
    "has_stop_desk": 0
  },
  "894": {
    "nom": "Lioua",
    "wilaya_id": 7,
    "code_postal": "722",
    "has_stop_desk": 0
  },
  "895": {
    "nom": "M Chedallah",
    "wilaya_id": 10,
    "code_postal": "1037",
    "has_stop_desk": 0
  },
  "896": {
    "nom": "M Doukal",
    "wilaya_id": 5,
    "code_postal": "555",
    "has_stop_desk": 0
  },
  "897": {
    "nom": "M Liliha",
    "wilaya_id": 17,
    "code_postal": "1713",
    "has_stop_desk": 0
  },
  "898": {
    "nom": "M'chouneche",
    "wilaya_id": 7,
    "code_postal": "712",
    "has_stop_desk": 0
  },
  "899": {
    "nom": "M'cid",
    "wilaya_id": 22,
    "code_postal": "2226",
    "has_stop_desk": 0
  },
  "900": {
    "nom": "M'cif",
    "wilaya_id": 28,
    "code_postal": "2808",
    "has_stop_desk": 0
  },
  "901": {
    "nom": "M'cisna",
    "wilaya_id": 6,
    "code_postal": "609",
    "has_stop_desk": 0
  },
  "902": {
    "nom": "M'daourouche",
    "wilaya_id": 41,
    "code_postal": "4115",
    "has_stop_desk": 0
  },
  "903": {
    "nom": "M'kira",
    "wilaya_id": 15,
    "code_postal": "1526",
    "has_stop_desk": 0
  },
  "904": {
    "nom": "M'lili",
    "wilaya_id": 7,
    "code_postal": "725",
    "has_stop_desk": 0
  },
  "905": {
    "nom": "M'sara",
    "wilaya_id": 40,
    "code_postal": "4018",
    "has_stop_desk": 0
  },
  "906": {
    "nom": "M'sila",
    "wilaya_id": 28,
    "code_postal": "2801",
    "has_stop_desk": 0
  },
  "907": {
    "nom": "M'tarfa",
    "wilaya_id": 28,
    "code_postal": "2806",
    "has_stop_desk": 0
  },
  "908": {
    "nom": "M'toussa",
    "wilaya_id": 40,
    "code_postal": "4002",
    "has_stop_desk": 0
  },
  "909": {
    "nom": "Maacem",
    "wilaya_id": 38,
    "code_postal": "3817",
    "has_stop_desk": 0
  },
  "910": {
    "nom": "Maadid",
    "wilaya_id": 28,
    "code_postal": "2802",
    "has_stop_desk": 0
  },
  "911": {
    "nom": "Maafa",
    "wilaya_id": 5,
    "code_postal": "503",
    "has_stop_desk": 0
  },
  "912": {
    "nom": "Maala",
    "wilaya_id": 10,
    "code_postal": "1014",
    "has_stop_desk": 0
  },
  "913": {
    "nom": "Maalma",
    "wilaya_id": 16,
    "code_postal": "1646",
    "has_stop_desk": 1
  },
  "914": {
    "nom": "Maamora",
    "wilaya_id": 20,
    "code_postal": "2011",
    "has_stop_desk": 0
  },
  "915": {
    "nom": "Maaouia",
    "wilaya_id": 19,
    "code_postal": "1912",
    "has_stop_desk": 0
  },
  "916": {
    "nom": "Maarif",
    "wilaya_id": 28,
    "code_postal": "2829",
    "has_stop_desk": 0
  },
  "917": {
    "nom": "Maatkas",
    "wilaya_id": 15,
    "code_postal": "1529",
    "has_stop_desk": 0
  },
  "918": {
    "nom": "Machroha",
    "wilaya_id": 41,
    "code_postal": "4104",
    "has_stop_desk": 0
  },
  "919": {
    "nom": "Madna",
    "wilaya_id": 14,
    "code_postal": "1410",
    "has_stop_desk": 0
  },
  "920": {
    "nom": "Maghnia",
    "wilaya_id": 13,
    "code_postal": "1327",
    "has_stop_desk": 0
  },
  "921": {
    "nom": "Maghraoua",
    "wilaya_id": 26,
    "code_postal": "2639",
    "has_stop_desk": 0
  },
  "922": {
    "nom": "Magra",
    "wilaya_id": 28,
    "code_postal": "2811",
    "has_stop_desk": 0
  },
  "923": {
    "nom": "Magrane",
    "wilaya_id": 39,
    "code_postal": "3918",
    "has_stop_desk": 0
  },
  "924": {
    "nom": "Mahdia",
    "wilaya_id": 14,
    "code_postal": "1415",
    "has_stop_desk": 0
  },
  "925": {
    "nom": "Makedra",
    "wilaya_id": 22,
    "code_postal": "2216",
    "has_stop_desk": 0
  },
  "926": {
    "nom": "Makhda",
    "wilaya_id": 29,
    "code_postal": "2915",
    "has_stop_desk": 0
  },
  "927": {
    "nom": "Makman Ben Amer",
    "wilaya_id": 45,
    "code_postal": "4510",
    "has_stop_desk": 0
  },
  "928": {
    "nom": "Makouda",
    "wilaya_id": 15,
    "code_postal": "1509",
    "has_stop_desk": 0
  },
  "929": {
    "nom": "Mamora",
    "wilaya_id": 10,
    "code_postal": "1039",
    "has_stop_desk": 0
  },
  "930": {
    "nom": "Mansoura",
    "wilaya_id": 34,
    "code_postal": "3404",
    "has_stop_desk": 0
  },
  "931": {
    "nom": "Mansoura",
    "wilaya_id": 47,
    "code_postal": "4713",
    "has_stop_desk": 0
  },
  "932": {
    "nom": "Mansourah",
    "wilaya_id": 13,
    "code_postal": "1351",
    "has_stop_desk": 0
  },
  "933": {
    "nom": "Mansourah",
    "wilaya_id": 27,
    "code_postal": "2723",
    "has_stop_desk": 0
  },
  "934": {
    "nom": "Maouaklane",
    "wilaya_id": 19,
    "code_postal": "1955",
    "has_stop_desk": 0
  },
  "935": {
    "nom": "Maoussa",
    "wilaya_id": 29,
    "code_postal": "2905",
    "has_stop_desk": 0
  },
  "936": {
    "nom": "Marhoum",
    "wilaya_id": 22,
    "code_postal": "2210",
    "has_stop_desk": 0
  },
  "937": {
    "nom": "Marsa Ben M'hidi",
    "wilaya_id": 13,
    "code_postal": "1339",
    "has_stop_desk": 0
  },
  "938": {
    "nom": "Marsat El Hadjadj",
    "wilaya_id": 31,
    "code_postal": "3108",
    "has_stop_desk": 0
  },
  "939": {
    "nom": "Mascara",
    "wilaya_id": 29,
    "code_postal": "2901",
    "has_stop_desk": 0
  },
  "940": {
    "nom": "Matemore",
    "wilaya_id": 29,
    "code_postal": "2914",
    "has_stop_desk": 0
  },
  "941": {
    "nom": "Mazagran",
    "wilaya_id": 27,
    "code_postal": "2727",
    "has_stop_desk": 0
  },
  "942": {
    "nom": "Mazouna",
    "wilaya_id": 48,
    "code_postal": "4822",
    "has_stop_desk": 0
  },
  "943": {
    "nom": "Mecheria",
    "wilaya_id": 45,
    "code_postal": "4502",
    "has_stop_desk": 0
  },
  "944": {
    "nom": "Mechraa H.boumediene",
    "wilaya_id": 8,
    "code_postal": "809",
    "has_stop_desk": 0
  },
  "945": {
    "nom": "Mechraa Safa",
    "wilaya_id": 14,
    "code_postal": "1434",
    "has_stop_desk": 0
  },
  "946": {
    "nom": "Mechtras",
    "wilaya_id": 15,
    "code_postal": "1506",
    "has_stop_desk": 0
  },
  "947": {
    "nom": "Medea",
    "wilaya_id": 26,
    "code_postal": "2601",
    "has_stop_desk": 0
  },
  "948": {
    "nom": "Mediouna",
    "wilaya_id": 48,
    "code_postal": "4809",
    "has_stop_desk": 0
  },
  "949": {
    "nom": "Medjana",
    "wilaya_id": 34,
    "code_postal": "3413",
    "has_stop_desk": 0
  },
  "950": {
    "nom": "Medjebar",
    "wilaya_id": 26,
    "code_postal": "2662",
    "has_stop_desk": 0
  },
  "951": {
    "nom": "Medjedel",
    "wilaya_id": 28,
    "code_postal": "2842",
    "has_stop_desk": 0
  },
  "952": {
    "nom": "Medjez Amar",
    "wilaya_id": 24,
    "code_postal": "2424",
    "has_stop_desk": 0
  },
  "953": {
    "nom": "Medjez Sfa",
    "wilaya_id": 24,
    "code_postal": "2430",
    "has_stop_desk": 0
  },
  "954": {
    "nom": "Medrissa",
    "wilaya_id": 14,
    "code_postal": "1408",
    "has_stop_desk": 0
  },
  "955": {
    "nom": "Medroussa",
    "wilaya_id": 14,
    "code_postal": "1402",
    "has_stop_desk": 0
  },
  "956": {
    "nom": "Meftah",
    "wilaya_id": 9,
    "code_postal": "914",
    "has_stop_desk": 1
  },
  "957": {
    "nom": "Meftaha",
    "wilaya_id": 26,
    "code_postal": "2649",
    "has_stop_desk": 0
  },
  "958": {
    "nom": "Megarine",
    "wilaya_id": 55,
    "code_postal": "5512",
    "has_stop_desk": 0
  },
  "959": {
    "nom": "Meghila",
    "wilaya_id": 14,
    "code_postal": "1421",
    "has_stop_desk": 0
  },
  "960": {
    "nom": "Mekhadma",
    "wilaya_id": 7,
    "code_postal": "730",
    "has_stop_desk": 0
  },
  "961": {
    "nom": "Mekhatria",
    "wilaya_id": 44,
    "code_postal": "4430",
    "has_stop_desk": 0
  },
  "962": {
    "nom": "Mekla",
    "wilaya_id": 15,
    "code_postal": "1550",
    "has_stop_desk": 0
  },
  "963": {
    "nom": "Melaab",
    "wilaya_id": 38,
    "code_postal": "3807",
    "has_stop_desk": 0
  },
  "964": {
    "nom": "Melbou",
    "wilaya_id": 6,
    "code_postal": "641",
    "has_stop_desk": 0
  },
  "965": {
    "nom": "Mellakou",
    "wilaya_id": 14,
    "code_postal": "1412",
    "has_stop_desk": 0
  },
  "966": {
    "nom": "Menaa",
    "wilaya_id": 5,
    "code_postal": "506",
    "has_stop_desk": 0
  },
  "967": {
    "nom": "Menaa",
    "wilaya_id": 28,
    "code_postal": "2839",
    "has_stop_desk": 0
  },
  "968": {
    "nom": "Menaceur",
    "wilaya_id": 42,
    "code_postal": "4202",
    "has_stop_desk": 0
  },
  "969": {
    "nom": "Mendes",
    "wilaya_id": 48,
    "code_postal": "4828",
    "has_stop_desk": 0
  },
  "970": {
    "nom": "Merad",
    "wilaya_id": 42,
    "code_postal": "4216",
    "has_stop_desk": 0
  },
  "971": {
    "nom": "Merahna",
    "wilaya_id": 41,
    "code_postal": "4112",
    "has_stop_desk": 0
  },
  "972": {
    "nom": "Merdja Sidi Abed",
    "wilaya_id": 48,
    "code_postal": "4837",
    "has_stop_desk": 0
  },
  "973": {
    "nom": "Meridja",
    "wilaya_id": 8,
    "code_postal": "804",
    "has_stop_desk": 0
  },
  "974": {
    "nom": "Merine",
    "wilaya_id": 22,
    "code_postal": "2222",
    "has_stop_desk": 0
  },
  "975": {
    "nom": "Merouana",
    "wilaya_id": 5,
    "code_postal": "504",
    "has_stop_desk": 0
  },
  "976": {
    "nom": "Mers El Kebir",
    "wilaya_id": 31,
    "code_postal": "3115",
    "has_stop_desk": 0
  },
  "977": {
    "nom": "Meskiana",
    "wilaya_id": 4,
    "code_postal": "424",
    "has_stop_desk": 0
  },
  "978": {
    "nom": "Mesra",
    "wilaya_id": 27,
    "code_postal": "2722",
    "has_stop_desk": 0
  },
  "979": {
    "nom": "Messaad",
    "wilaya_id": 17,
    "code_postal": "1717",
    "has_stop_desk": 0
  },
  "980": {
    "nom": "Messaoud Boujeriou",
    "wilaya_id": 25,
    "code_postal": "2511",
    "has_stop_desk": 0
  },
  "981": {
    "nom": "Messelmoun",
    "wilaya_id": 42,
    "code_postal": "4222",
    "has_stop_desk": 0
  },
  "982": {
    "nom": "Messerghin",
    "wilaya_id": 31,
    "code_postal": "3123",
    "has_stop_desk": 0
  },
  "983": {
    "nom": "Metarfa",
    "wilaya_id": 49,
    "code_postal": "4907",
    "has_stop_desk": 0
  },
  "984": {
    "nom": "Metlili",
    "wilaya_id": 47,
    "code_postal": "4705",
    "has_stop_desk": 0
  },
  "985": {
    "nom": "Mezaourou",
    "wilaya_id": 22,
    "code_postal": "2206",
    "has_stop_desk": 0
  },
  "986": {
    "nom": "Mezdour",
    "wilaya_id": 10,
    "code_postal": "1011",
    "has_stop_desk": 0
  },
  "987": {
    "nom": "Mezerana",
    "wilaya_id": 26,
    "code_postal": "2611",
    "has_stop_desk": 0
  },
  "988": {
    "nom": "Meziraa",
    "wilaya_id": 7,
    "code_postal": "728",
    "has_stop_desk": 0
  },
  "989": {
    "nom": "Mezloug",
    "wilaya_id": 19,
    "code_postal": "1933",
    "has_stop_desk": 0
  },
  "990": {
    "nom": "Mih Ouansa",
    "wilaya_id": 39,
    "code_postal": "3926",
    "has_stop_desk": 0
  },
  "991": {
    "nom": "Mihoub",
    "wilaya_id": 26,
    "code_postal": "2650",
    "has_stop_desk": 0
  },
  "992": {
    "nom": "Mila",
    "wilaya_id": 43,
    "code_postal": "4301",
    "has_stop_desk": 0
  },
  "993": {
    "nom": "Miliana",
    "wilaya_id": 44,
    "code_postal": "4402",
    "has_stop_desk": 0
  },
  "994": {
    "nom": "Minar Zarza",
    "wilaya_id": 43,
    "code_postal": "4321",
    "has_stop_desk": 0
  },
  "995": {
    "nom": "Mizrana",
    "wilaya_id": 15,
    "code_postal": "1562",
    "has_stop_desk": 0
  },
  "996": {
    "nom": "Mnaguer",
    "wilaya_id": 55,
    "code_postal": "5511",
    "has_stop_desk": 0
  },
  "997": {
    "nom": "Mocta Douz",
    "wilaya_id": 29,
    "code_postal": "2936",
    "has_stop_desk": 0
  },
  "998": {
    "nom": "Mogheul",
    "wilaya_id": 8,
    "code_postal": "816",
    "has_stop_desk": 0
  },
  "999": {
    "nom": "Moghrar",
    "wilaya_id": 45,
    "code_postal": "4506",
    "has_stop_desk": 0
  },
  "1000": {
    "nom": "Mohamed Belouzdad",
    "wilaya_id": 16,
    "code_postal": "1604",
    "has_stop_desk": 1
  },
  "1001": {
    "nom": "Mohamed Boudiaf",
    "wilaya_id": 28,
    "code_postal": "2834",
    "has_stop_desk": 0
  },
  "1002": {
    "nom": "Mohammadia",
    "wilaya_id": 16,
    "code_postal": "1629",
    "has_stop_desk": 1
  },
  "1003": {
    "nom": "Mohammadia",
    "wilaya_id": 29,
    "code_postal": "2931",
    "has_stop_desk": 0
  },
  "1004": {
    "nom": "Morssot",
    "wilaya_id": 12,
    "code_postal": "1212",
    "has_stop_desk": 0
  },
  "1005": {
    "nom": "Mostaganem",
    "wilaya_id": 27,
    "code_postal": "2701",
    "has_stop_desk": 0
  },
  "1006": {
    "nom": "Mostefa Ben Brahim",
    "wilaya_id": 22,
    "code_postal": "2204",
    "has_stop_desk": 0
  },
  "1007": {
    "nom": "Moudjebara",
    "wilaya_id": 17,
    "code_postal": "1702",
    "has_stop_desk": 0
  },
  "1008": {
    "nom": "Moulay Larbi",
    "wilaya_id": 20,
    "code_postal": "2005",
    "has_stop_desk": 0
  },
  "1009": {
    "nom": "Moulay Slissen",
    "wilaya_id": 22,
    "code_postal": "2218",
    "has_stop_desk": 0
  },
  "1010": {
    "nom": "Moussadek",
    "wilaya_id": 2,
    "code_postal": "226",
    "has_stop_desk": 0
  },
  "1011": {
    "nom": "Mouzaia",
    "wilaya_id": 9,
    "code_postal": "912",
    "has_stop_desk": 1
  },
  "1012": {
    "nom": "Mrara",
    "wilaya_id": 57,
    "code_postal": "5703",
    "has_stop_desk": 0
  },
  "1013": {
    "nom": "Msirda Fouaga",
    "wilaya_id": 13,
    "code_postal": "1330",
    "has_stop_desk": 0
  },
  "1014": {
    "nom": "N Gaous",
    "wilaya_id": 5,
    "code_postal": "509",
    "has_stop_desk": 0
  },
  "1015": {
    "nom": "N'goussa",
    "wilaya_id": 30,
    "code_postal": "3003",
    "has_stop_desk": 0
  },
  "1016": {
    "nom": "Naama",
    "wilaya_id": 45,
    "code_postal": "4501",
    "has_stop_desk": 0
  },
  "1017": {
    "nom": "Naciria",
    "wilaya_id": 35,
    "code_postal": "3507",
    "has_stop_desk": 0
  },
  "1018": {
    "nom": "Nador",
    "wilaya_id": 42,
    "code_postal": "4211",
    "has_stop_desk": 0
  },
  "1019": {
    "nom": "Nadorah",
    "wilaya_id": 14,
    "code_postal": "1431",
    "has_stop_desk": 0
  },
  "1020": {
    "nom": "Naima",
    "wilaya_id": 14,
    "code_postal": "1420",
    "has_stop_desk": 0
  },
  "1021": {
    "nom": "Nakhla",
    "wilaya_id": 39,
    "code_postal": "3905",
    "has_stop_desk": 0
  },
  "1022": {
    "nom": "Nechmaya",
    "wilaya_id": 24,
    "code_postal": "2402",
    "has_stop_desk": 0
  },
  "1023": {
    "nom": "Nedroma",
    "wilaya_id": 13,
    "code_postal": "1340",
    "has_stop_desk": 0
  },
  "1024": {
    "nom": "Negrine",
    "wilaya_id": 12,
    "code_postal": "1209",
    "has_stop_desk": 0
  },
  "1025": {
    "nom": "Nekmaria",
    "wilaya_id": 27,
    "code_postal": "2715",
    "has_stop_desk": 0
  },
  "1026": {
    "nom": "Nesmot",
    "wilaya_id": 29,
    "code_postal": "2945",
    "has_stop_desk": 0
  },
  "1027": {
    "nom": "Nezla",
    "wilaya_id": 55,
    "code_postal": "5504",
    "has_stop_desk": 0
  },
  "1028": {
    "nom": "Oggaz",
    "wilaya_id": 29,
    "code_postal": "2927",
    "has_stop_desk": 0
  },
  "1029": {
    "nom": "Oran",
    "wilaya_id": 31,
    "code_postal": "3101",
    "has_stop_desk": 0
  },
  "1030": {
    "nom": "Ouacif",
    "wilaya_id": 15,
    "code_postal": "1548",
    "has_stop_desk": 0
  },
  "1031": {
    "nom": "Ouadhias",
    "wilaya_id": 15,
    "code_postal": "1536",
    "has_stop_desk": 0
  },
  "1032": {
    "nom": "Ouaguenoune",
    "wilaya_id": 15,
    "code_postal": "1524",
    "has_stop_desk": 0
  },
  "1033": {
    "nom": "Ouamri",
    "wilaya_id": 26,
    "code_postal": "2643",
    "has_stop_desk": 0
  },
  "1034": {
    "nom": "Ouanougha",
    "wilaya_id": 28,
    "code_postal": "2819",
    "has_stop_desk": 0
  },
  "1035": {
    "nom": "Ouargla",
    "wilaya_id": 30,
    "code_postal": "3001",
    "has_stop_desk": 0
  },
  "1036": {
    "nom": "Ouarizane",
    "wilaya_id": 48,
    "code_postal": "4821",
    "has_stop_desk": 0
  },
  "1037": {
    "nom": "Oudjana",
    "wilaya_id": 18,
    "code_postal": "1828",
    "has_stop_desk": 0
  },
  "1038": {
    "nom": "Oued Athmenia",
    "wilaya_id": 43,
    "code_postal": "4304",
    "has_stop_desk": 0
  },
  "1039": {
    "nom": "Oued Berkeche",
    "wilaya_id": 46,
    "code_postal": "4606",
    "has_stop_desk": 0
  },
  "1040": {
    "nom": "Oued Chaaba",
    "wilaya_id": 5,
    "code_postal": "537",
    "has_stop_desk": 0
  },
  "1041": {
    "nom": "Oued Cheham",
    "wilaya_id": 24,
    "code_postal": "2433",
    "has_stop_desk": 0
  },
  "1042": {
    "nom": "Oued Chorfa",
    "wilaya_id": 44,
    "code_postal": "4413",
    "has_stop_desk": 0
  },
  "1043": {
    "nom": "Oued Chouly",
    "wilaya_id": 13,
    "code_postal": "1311",
    "has_stop_desk": 0
  },
  "1044": {
    "nom": "Oued Djemaa",
    "wilaya_id": 44,
    "code_postal": "4415",
    "has_stop_desk": 0
  },
  "1045": {
    "nom": "Oued Djer",
    "wilaya_id": 9,
    "code_postal": "918",
    "has_stop_desk": 1
  },
  "1046": {
    "nom": "Oued El Abtal",
    "wilaya_id": 29,
    "code_postal": "2910",
    "has_stop_desk": 0
  },
  "1047": {
    "nom": "Oued El Alenda",
    "wilaya_id": 39,
    "code_postal": "3903",
    "has_stop_desk": 0
  },
  "1048": {
    "nom": "Oued El Alleug",
    "wilaya_id": 9,
    "code_postal": "904",
    "has_stop_desk": 1
  },
  "1049": {
    "nom": "Oued El Aneb",
    "wilaya_id": 23,
    "code_postal": "2306",
    "has_stop_desk": 0
  },
  "1050": {
    "nom": "Oued El Barad",
    "wilaya_id": 19,
    "code_postal": "1957",
    "has_stop_desk": 0
  },
  "1051": {
    "nom": "Oued El Berdi",
    "wilaya_id": 10,
    "code_postal": "1045",
    "has_stop_desk": 0
  },
  "1052": {
    "nom": "Oued El Djemaa",
    "wilaya_id": 48,
    "code_postal": "4826",
    "has_stop_desk": 0
  },
  "1053": {
    "nom": "Oued El Kheir",
    "wilaya_id": 27,
    "code_postal": "2709",
    "has_stop_desk": 0
  },
  "1054": {
    "nom": "Oued El Ma",
    "wilaya_id": 5,
    "code_postal": "533",
    "has_stop_desk": 0
  },
  "1055": {
    "nom": "Oued Endja",
    "wilaya_id": 43,
    "code_postal": "4310",
    "has_stop_desk": 0
  },
  "1056": {
    "nom": "Oued Essalem",
    "wilaya_id": 48,
    "code_postal": "4820",
    "has_stop_desk": 0
  },
  "1057": {
    "nom": "Oued Fodda",
    "wilaya_id": 2,
    "code_postal": "229",
    "has_stop_desk": 0
  },
  "1058": {
    "nom": "Oued Fragha",
    "wilaya_id": 24,
    "code_postal": "2406",
    "has_stop_desk": 0
  },
  "1059": {
    "nom": "Oued Ghir",
    "wilaya_id": 6,
    "code_postal": "651",
    "has_stop_desk": 0
  },
  "1060": {
    "nom": "Oued Goussine",
    "wilaya_id": 2,
    "code_postal": "216",
    "has_stop_desk": 0
  },
  "1061": {
    "nom": "Oued Harbil",
    "wilaya_id": 26,
    "code_postal": "2629",
    "has_stop_desk": 0
  },
  "1062": {
    "nom": "Oued Kebrit",
    "wilaya_id": 41,
    "code_postal": "4124",
    "has_stop_desk": 0
  },
  "1063": {
    "nom": "Oued Koriche",
    "wilaya_id": 16,
    "code_postal": "1608",
    "has_stop_desk": 1
  },
  "1064": {
    "nom": "Oued Lilli",
    "wilaya_id": 14,
    "code_postal": "1433",
    "has_stop_desk": 0
  },
  "1065": {
    "nom": "Oued M'zi",
    "wilaya_id": 3,
    "code_postal": "322",
    "has_stop_desk": 0
  },
  "1066": {
    "nom": "Oued Morra",
    "wilaya_id": 3,
    "code_postal": "321",
    "has_stop_desk": 0
  },
  "1067": {
    "nom": "Oued Nini",
    "wilaya_id": 4,
    "code_postal": "423",
    "has_stop_desk": 0
  },
  "1068": {
    "nom": "Oued Rhiou",
    "wilaya_id": 48,
    "code_postal": "4802",
    "has_stop_desk": 0
  },
  "1069": {
    "nom": "Oued Sebaa",
    "wilaya_id": 22,
    "code_postal": "2237",
    "has_stop_desk": 0
  },
  "1070": {
    "nom": "Oued Sebbah",
    "wilaya_id": 46,
    "code_postal": "4616",
    "has_stop_desk": 0
  },
  "1071": {
    "nom": "Oued Sefioun",
    "wilaya_id": 22,
    "code_postal": "2243",
    "has_stop_desk": 0
  },
  "1072": {
    "nom": "Oued Seguen",
    "wilaya_id": 43,
    "code_postal": "4307",
    "has_stop_desk": 0
  },
  "1073": {
    "nom": "Oued Sly",
    "wilaya_id": 2,
    "code_postal": "221",
    "has_stop_desk": 0
  },
  "1074": {
    "nom": "Oued Smar",
    "wilaya_id": 16,
    "code_postal": "1615",
    "has_stop_desk": 1
  },
  "1075": {
    "nom": "Oued Taga",
    "wilaya_id": 5,
    "code_postal": "548",
    "has_stop_desk": 0
  },
  "1076": {
    "nom": "Oued Taourira",
    "wilaya_id": 22,
    "code_postal": "2231",
    "has_stop_desk": 0
  },
  "1077": {
    "nom": "Oued Taria",
    "wilaya_id": 29,
    "code_postal": "2922",
    "has_stop_desk": 0
  },
  "1078": {
    "nom": "Oued Tlelat",
    "wilaya_id": 31,
    "code_postal": "3111",
    "has_stop_desk": 0
  },
  "1079": {
    "nom": "Oued Zenati",
    "wilaya_id": 24,
    "code_postal": "2404",
    "has_stop_desk": 0
  },
  "1080": {
    "nom": "Oued Zhour",
    "wilaya_id": 21,
    "code_postal": "2114",
    "has_stop_desk": 0
  },
  "1081": {
    "nom": "Oued Zitoun",
    "wilaya_id": 36,
    "code_postal": "3622",
    "has_stop_desk": 0
  },
  "1082": {
    "nom": "Ouenza",
    "wilaya_id": 12,
    "code_postal": "1219",
    "has_stop_desk": 0
  },
  "1083": {
    "nom": "Ouldja Boulbalout",
    "wilaya_id": 21,
    "code_postal": "2135",
    "has_stop_desk": 0
  },
  "1084": {
    "nom": "Ouled Abbes",
    "wilaya_id": 2,
    "code_postal": "218",
    "has_stop_desk": 0
  },
  "1085": {
    "nom": "Ouled Addi Guebala",
    "wilaya_id": 28,
    "code_postal": "2814",
    "has_stop_desk": 0
  },
  "1086": {
    "nom": "Ouled Addouane",
    "wilaya_id": 19,
    "code_postal": "1924",
    "has_stop_desk": 0
  },
  "1087": {
    "nom": "Ouled Ahmed Timmi",
    "wilaya_id": 1,
    "code_postal": "121",
    "has_stop_desk": 0
  },
  "1088": {
    "nom": "Ouled Aiche",
    "wilaya_id": 48,
    "code_postal": "4805",
    "has_stop_desk": 0
  },
  "1089": {
    "nom": "Ouled Aissa",
    "wilaya_id": 35,
    "code_postal": "3521",
    "has_stop_desk": 0
  },
  "1090": {
    "nom": "Ouled Aissa",
    "wilaya_id": 49,
    "code_postal": "4910",
    "has_stop_desk": 0
  },
  "1091": {
    "nom": "Ouled Ammar",
    "wilaya_id": 5,
    "code_postal": "556",
    "has_stop_desk": 0
  },
  "1092": {
    "nom": "Ouled Antar",
    "wilaya_id": 26,
    "code_postal": "2658",
    "has_stop_desk": 0
  },
  "1093": {
    "nom": "Ouled Aouf",
    "wilaya_id": 5,
    "code_postal": "540",
    "has_stop_desk": 0
  },
  "1094": {
    "nom": "Ouled Attia",
    "wilaya_id": 21,
    "code_postal": "2113",
    "has_stop_desk": 0
  },
  "1095": {
    "nom": "Ouled Ben Abdelkader",
    "wilaya_id": 2,
    "code_postal": "230",
    "has_stop_desk": 0
  },
  "1096": {
    "nom": "Ouled Bessem",
    "wilaya_id": 38,
    "code_postal": "3812",
    "has_stop_desk": 0
  },
  "1097": {
    "nom": "Ouled Bouachra",
    "wilaya_id": 26,
    "code_postal": "2627",
    "has_stop_desk": 0
  },
  "1098": {
    "nom": "Ouled Boudjemaa",
    "wilaya_id": 46,
    "code_postal": "4617",
    "has_stop_desk": 0
  },
  "1099": {
    "nom": "Ouled Boughalem",
    "wilaya_id": 27,
    "code_postal": "2725",
    "has_stop_desk": 0
  },
  "1100": {
    "nom": "Ouled Brahem",
    "wilaya_id": 34,
    "code_postal": "3417",
    "has_stop_desk": 0
  },
  "1101": {
    "nom": "Ouled Brahim",
    "wilaya_id": 20,
    "code_postal": "2014",
    "has_stop_desk": 0
  },
  "1102": {
    "nom": "Ouled Brahim",
    "wilaya_id": 26,
    "code_postal": "2612",
    "has_stop_desk": 0
  },
  "1103": {
    "nom": "Ouled Chebel",
    "wilaya_id": 16,
    "code_postal": "1635",
    "has_stop_desk": 1
  },
  "1104": {
    "nom": "Ouled Dahmane",
    "wilaya_id": 34,
    "code_postal": "3418",
    "has_stop_desk": 0
  },
  "1105": {
    "nom": "Ouled Deid",
    "wilaya_id": 26,
    "code_postal": "2606",
    "has_stop_desk": 0
  },
  "1106": {
    "nom": "Ouled Derradj",
    "wilaya_id": 28,
    "code_postal": "2804",
    "has_stop_desk": 0
  },
  "1107": {
    "nom": "Ouled Djellal",
    "wilaya_id": 51,
    "code_postal": "5101",
    "has_stop_desk": 0
  },
  "1108": {
    "nom": "Ouled Driss",
    "wilaya_id": 41,
    "code_postal": "4105",
    "has_stop_desk": 0
  },
  "1109": {
    "nom": "Ouled Fadel",
    "wilaya_id": 5,
    "code_postal": "549",
    "has_stop_desk": 0
  },
  "1110": {
    "nom": "Ouled Fares",
    "wilaya_id": 2,
    "code_postal": "210",
    "has_stop_desk": 0
  },
  "1111": {
    "nom": "Ouled Fayet",
    "wilaya_id": 16,
    "code_postal": "1651",
    "has_stop_desk": 1
  },
  "1112": {
    "nom": "Ouled Gacem",
    "wilaya_id": 4,
    "code_postal": "428",
    "has_stop_desk": 0
  },
  "1113": {
    "nom": "Ouled Habbeba",
    "wilaya_id": 21,
    "code_postal": "2118",
    "has_stop_desk": 0
  },
  "1114": {
    "nom": "Ouled Hamla",
    "wilaya_id": 4,
    "code_postal": "410",
    "has_stop_desk": 0
  },
  "1115": {
    "nom": "Ouled Hedadj",
    "wilaya_id": 35,
    "code_postal": "3528",
    "has_stop_desk": 0
  },
  "1116": {
    "nom": "Ouled Hellal",
    "wilaya_id": 26,
    "code_postal": "2622",
    "has_stop_desk": 0
  },
  "1117": {
    "nom": "Ouled Khaled",
    "wilaya_id": 20,
    "code_postal": "2004",
    "has_stop_desk": 0
  },
  "1118": {
    "nom": "Ouled Khalouf",
    "wilaya_id": 43,
    "code_postal": "4312",
    "has_stop_desk": 0
  },
  "1119": {
    "nom": "Ouled Khoudir",
    "wilaya_id": 52,
    "code_postal": "5202",
    "has_stop_desk": 0
  },
  "1120": {
    "nom": "Ouled Kihal",
    "wilaya_id": 46,
    "code_postal": "4622",
    "has_stop_desk": 0
  },
  "1121": {
    "nom": "Ouled Maalah",
    "wilaya_id": 27,
    "code_postal": "2726",
    "has_stop_desk": 0
  },
  "1122": {
    "nom": "Ouled Maaref",
    "wilaya_id": 26,
    "code_postal": "2603",
    "has_stop_desk": 0
  },
  "1123": {
    "nom": "Ouled Madhi",
    "wilaya_id": 28,
    "code_postal": "2810",
    "has_stop_desk": 0
  },
  "1124": {
    "nom": "Ouled Mansour",
    "wilaya_id": 28,
    "code_postal": "2828",
    "has_stop_desk": 0
  },
  "1125": {
    "nom": "Ouled Mimoun",
    "wilaya_id": 13,
    "code_postal": "1313",
    "has_stop_desk": 0
  },
  "1126": {
    "nom": "Ouled Moumen",
    "wilaya_id": 41,
    "code_postal": "4113",
    "has_stop_desk": 0
  },
  "1127": {
    "nom": "Ouled Moussa",
    "wilaya_id": 35,
    "code_postal": "3517",
    "has_stop_desk": 0
  },
  "1128": {
    "nom": "Ouled Rabah",
    "wilaya_id": 18,
    "code_postal": "1827",
    "has_stop_desk": 0
  },
  "1129": {
    "nom": "Ouled Rached",
    "wilaya_id": 10,
    "code_postal": "1040",
    "has_stop_desk": 0
  },
  "1130": {
    "nom": "Ouled Rahmouni",
    "wilaya_id": 25,
    "code_postal": "2509",
    "has_stop_desk": 0
  },
  "1131": {
    "nom": "Ouled Rechache",
    "wilaya_id": 40,
    "code_postal": "4016",
    "has_stop_desk": 0
  },
  "1132": {
    "nom": "Ouled Riyah",
    "wilaya_id": 13,
    "code_postal": "1346",
    "has_stop_desk": 0
  },
  "1133": {
    "nom": "Ouled Sabor",
    "wilaya_id": 19,
    "code_postal": "1947",
    "has_stop_desk": 0
  },
  "1134": {
    "nom": "Ouled Said",
    "wilaya_id": 49,
    "code_postal": "4904",
    "has_stop_desk": 0
  },
  "1135": {
    "nom": "Ouled Sellem",
    "wilaya_id": 5,
    "code_postal": "520",
    "has_stop_desk": 0
  },
  "1136": {
    "nom": "Ouled Si Ahmed",
    "wilaya_id": 19,
    "code_postal": "1904",
    "has_stop_desk": 0
  },
  "1137": {
    "nom": "Ouled Si Slimane",
    "wilaya_id": 5,
    "code_postal": "553",
    "has_stop_desk": 0
  },
  "1138": {
    "nom": "Ouled Sidi Brahim",
    "wilaya_id": 28,
    "code_postal": "2821",
    "has_stop_desk": 0
  },
  "1139": {
    "nom": "Ouled Sidi Brahim",
    "wilaya_id": 34,
    "code_postal": "3423",
    "has_stop_desk": 0
  },
  "1140": {
    "nom": "Ouled Sidi Mihoub",
    "wilaya_id": 48,
    "code_postal": "4838",
    "has_stop_desk": 0
  },
  "1141": {
    "nom": "Ouled Slama",
    "wilaya_id": 9,
    "code_postal": "915",
    "has_stop_desk": 1
  },
  "1142": {
    "nom": "Ouled Slimane",
    "wilaya_id": 28,
    "code_postal": "2825",
    "has_stop_desk": 0
  },
  "1143": {
    "nom": "Ouled Tebben",
    "wilaya_id": 19,
    "code_postal": "1910",
    "has_stop_desk": 0
  },
  "1144": {
    "nom": "Ouled Yahia Khadrouch",
    "wilaya_id": 18,
    "code_postal": "1821",
    "has_stop_desk": 0
  },
  "1145": {
    "nom": "Ouled Yaich",
    "wilaya_id": 9,
    "code_postal": "905",
    "has_stop_desk": 1
  },
  "1146": {
    "nom": "Ouled Zouai",
    "wilaya_id": 4,
    "code_postal": "420",
    "has_stop_desk": 0
  },
  "1147": {
    "nom": "Oulhaca El Gheraba",
    "wilaya_id": 46,
    "code_postal": "4625",
    "has_stop_desk": 0
  },
  "1148": {
    "nom": "Oulteme",
    "wilaya_id": 28,
    "code_postal": "2846",
    "has_stop_desk": 0
  },
  "1149": {
    "nom": "Oum Ali",
    "wilaya_id": 12,
    "code_postal": "1221",
    "has_stop_desk": 0
  },
  "1150": {
    "nom": "Oum Drou",
    "wilaya_id": 2,
    "code_postal": "233",
    "has_stop_desk": 0
  },
  "1151": {
    "nom": "Oum El Adhaim",
    "wilaya_id": 41,
    "code_postal": "4116",
    "has_stop_desk": 0
  },
  "1152": {
    "nom": "Oum El Assel",
    "wilaya_id": 37,
    "code_postal": "3702",
    "has_stop_desk": 0
  },
  "1153": {
    "nom": "Oum El Bouaghi",
    "wilaya_id": 4,
    "code_postal": "401",
    "has_stop_desk": 0
  },
  "1154": {
    "nom": "Oum El Djellil",
    "wilaya_id": 26,
    "code_postal": "2642",
    "has_stop_desk": 0
  },
  "1155": {
    "nom": "Oum Laadham",
    "wilaya_id": 17,
    "code_postal": "1724",
    "has_stop_desk": 0
  },
  "1156": {
    "nom": "Oum Toub",
    "wilaya_id": 21,
    "code_postal": "2128",
    "has_stop_desk": 0
  },
  "1157": {
    "nom": "Oum Touyour",
    "wilaya_id": 57,
    "code_postal": "5707",
    "has_stop_desk": 0
  },
  "1158": {
    "nom": "Oumache",
    "wilaya_id": 7,
    "code_postal": "702",
    "has_stop_desk": 0
  },
  "1159": {
    "nom": "Ourlal",
    "wilaya_id": 7,
    "code_postal": "724",
    "has_stop_desk": 0
  },
  "1160": {
    "nom": "Ourmes",
    "wilaya_id": 39,
    "code_postal": "3920",
    "has_stop_desk": 0
  },
  "1161": {
    "nom": "Ouyoun El Assafir",
    "wilaya_id": 5,
    "code_postal": "512",
    "has_stop_desk": 0
  },
  "1162": {
    "nom": "Ouzellaguene",
    "wilaya_id": 6,
    "code_postal": "636",
    "has_stop_desk": 0
  },
  "1163": {
    "nom": "Ouzera",
    "wilaya_id": 26,
    "code_postal": "2602",
    "has_stop_desk": 0
  },
  "1164": {
    "nom": "Quillen",
    "wilaya_id": 41,
    "code_postal": "4119",
    "has_stop_desk": 0
  },
  "1165": {
    "nom": "Rabta",
    "wilaya_id": 34,
    "code_postal": "3433",
    "has_stop_desk": 0
  },
  "1166": {
    "nom": "Ragouba",
    "wilaya_id": 41,
    "code_postal": "4122",
    "has_stop_desk": 0
  },
  "1167": {
    "nom": "Rahbat",
    "wilaya_id": 5,
    "code_postal": "525",
    "has_stop_desk": 0
  },
  "1168": {
    "nom": "Rahia",
    "wilaya_id": 4,
    "code_postal": "426",
    "has_stop_desk": 0
  },
  "1169": {
    "nom": "Rahmania",
    "wilaya_id": 16,
    "code_postal": "1650",
    "has_stop_desk": 1
  },
  "1170": {
    "nom": "Rahouia",
    "wilaya_id": 14,
    "code_postal": "1414",
    "has_stop_desk": 0
  },
  "1171": {
    "nom": "Rais Hamidou",
    "wilaya_id": 16,
    "code_postal": "1625",
    "has_stop_desk": 1
  },
  "1172": {
    "nom": "Ramdane Djamel",
    "wilaya_id": 21,
    "code_postal": "2123",
    "has_stop_desk": 0
  },
  "1173": {
    "nom": "Ramka",
    "wilaya_id": 48,
    "code_postal": "4827",
    "has_stop_desk": 0
  },
  "1174": {
    "nom": "Raml Souk",
    "wilaya_id": 36,
    "code_postal": "3624",
    "has_stop_desk": 0
  },
  "1175": {
    "nom": "Raouraoua",
    "wilaya_id": 10,
    "code_postal": "1010",
    "has_stop_desk": 0
  },
  "1176": {
    "nom": "Ras El Agba",
    "wilaya_id": 24,
    "code_postal": "2408",
    "has_stop_desk": 0
  },
  "1177": {
    "nom": "Ras El Ain Amirouche",
    "wilaya_id": 29,
    "code_postal": "2944",
    "has_stop_desk": 0
  },
  "1178": {
    "nom": "Ras El Aioun",
    "wilaya_id": 5,
    "code_postal": "551",
    "has_stop_desk": 0
  },
  "1179": {
    "nom": "Ras El Ma",
    "wilaya_id": 22,
    "code_postal": "2223",
    "has_stop_desk": 0
  },
  "1180": {
    "nom": "Ras El Miad",
    "wilaya_id": 51,
    "code_postal": "5102",
    "has_stop_desk": 0
  },
  "1181": {
    "nom": "Ras El Oued",
    "wilaya_id": 34,
    "code_postal": "3402",
    "has_stop_desk": 0
  },
  "1182": {
    "nom": "Rebaia",
    "wilaya_id": 26,
    "code_postal": "2620",
    "has_stop_desk": 0
  },
  "1183": {
    "nom": "Rechaiga",
    "wilaya_id": 14,
    "code_postal": "1430",
    "has_stop_desk": 0
  },
  "1184": {
    "nom": "Redjem Demouche",
    "wilaya_id": 22,
    "code_postal": "2250",
    "has_stop_desk": 0
  },
  "1185": {
    "nom": "Reggane",
    "wilaya_id": 1,
    "code_postal": "104",
    "has_stop_desk": 0
  },
  "1186": {
    "nom": "Reghaia",
    "wilaya_id": 16,
    "code_postal": "1640",
    "has_stop_desk": 1
  },
  "1187": {
    "nom": "Reguiba",
    "wilaya_id": 39,
    "code_postal": "3908",
    "has_stop_desk": 0
  },
  "1188": {
    "nom": "Relizane",
    "wilaya_id": 48,
    "code_postal": "4801",
    "has_stop_desk": 0
  },
  "1189": {
    "nom": "Remchi",
    "wilaya_id": 13,
    "code_postal": "1304",
    "has_stop_desk": 0
  },
  "1190": {
    "nom": "Remila",
    "wilaya_id": 40,
    "code_postal": "4010",
    "has_stop_desk": 0
  },
  "1191": {
    "nom": "Ridane",
    "wilaya_id": 10,
    "code_postal": "1032",
    "has_stop_desk": 0
  },
  "1192": {
    "nom": "Robbah",
    "wilaya_id": 39,
    "code_postal": "3902",
    "has_stop_desk": 0
  },
  "1193": {
    "nom": "Rogassa",
    "wilaya_id": 32,
    "code_postal": "3202",
    "has_stop_desk": 0
  },
  "1194": {
    "nom": "Roknia",
    "wilaya_id": 24,
    "code_postal": "2428",
    "has_stop_desk": 0
  },
  "1195": {
    "nom": "Rosfa",
    "wilaya_id": 19,
    "code_postal": "1923",
    "has_stop_desk": 0
  },
  "1196": {
    "nom": "Rouached",
    "wilaya_id": 43,
    "code_postal": "4315",
    "has_stop_desk": 0
  },
  "1197": {
    "nom": "Rouiba",
    "wilaya_id": 16,
    "code_postal": "1638",
    "has_stop_desk": 1
  },
  "1198": {
    "nom": "Rouina",
    "wilaya_id": 44,
    "code_postal": "4416",
    "has_stop_desk": 0
  },
  "1199": {
    "nom": "Rouissat",
    "wilaya_id": 30,
    "code_postal": "3005",
    "has_stop_desk": 0
  },
  "1200": {
    "nom": "Sabra",
    "wilaya_id": 13,
    "code_postal": "1306",
    "has_stop_desk": 0
  },
  "1201": {
    "nom": "Saf Saf El Ouesra",
    "wilaya_id": 12,
    "code_postal": "1207",
    "has_stop_desk": 0
  },
  "1202": {
    "nom": "Safel El Ouiden",
    "wilaya_id": 41,
    "code_postal": "4121",
    "has_stop_desk": 0
  },
  "1203": {
    "nom": "Safsaf",
    "wilaya_id": 27,
    "code_postal": "2730",
    "has_stop_desk": 0
  },
  "1204": {
    "nom": "Saharidj",
    "wilaya_id": 10,
    "code_postal": "1030",
    "has_stop_desk": 0
  },
  "1205": {
    "nom": "Saida",
    "wilaya_id": 20,
    "code_postal": "2001",
    "has_stop_desk": 0
  },
  "1206": {
    "nom": "Salah Bey",
    "wilaya_id": 19,
    "code_postal": "1939",
    "has_stop_desk": 0
  },
  "1207": {
    "nom": "Salah Bouchaour",
    "wilaya_id": 21,
    "code_postal": "2125",
    "has_stop_desk": 0
  },
  "1208": {
    "nom": "Sali",
    "wilaya_id": 1,
    "code_postal": "118",
    "has_stop_desk": 0
  },
  "1209": {
    "nom": "Saneg",
    "wilaya_id": 26,
    "code_postal": "2664",
    "has_stop_desk": 0
  },
  "1210": {
    "nom": "Sayada",
    "wilaya_id": 27,
    "code_postal": "2702",
    "has_stop_desk": 0
  },
  "1211": {
    "nom": "Sebaa",
    "wilaya_id": 1,
    "code_postal": "126",
    "has_stop_desk": 0
  },
  "1212": {
    "nom": "Sebaine",
    "wilaya_id": 14,
    "code_postal": "1425",
    "has_stop_desk": 0
  },
  "1213": {
    "nom": "Sebbaa Chioukh",
    "wilaya_id": 13,
    "code_postal": "1322",
    "has_stop_desk": 0
  },
  "1214": {
    "nom": "Sebdou",
    "wilaya_id": 13,
    "code_postal": "1335",
    "has_stop_desk": 0
  },
  "1215": {
    "nom": "Sebgag",
    "wilaya_id": 3,
    "code_postal": "316",
    "has_stop_desk": 0
  },
  "1216": {
    "nom": "Sebseb",
    "wilaya_id": 47,
    "code_postal": "4709",
    "has_stop_desk": 0
  },
  "1217": {
    "nom": "Sebt",
    "wilaya_id": 14,
    "code_postal": "1411",
    "has_stop_desk": 0
  },
  "1218": {
    "nom": "Sed Rahal",
    "wilaya_id": 17,
    "code_postal": "1706",
    "has_stop_desk": 0
  },
  "1219": {
    "nom": "Seddouk",
    "wilaya_id": 6,
    "code_postal": "626",
    "has_stop_desk": 0
  },
  "1220": {
    "nom": "Sedjerara",
    "wilaya_id": 29,
    "code_postal": "2935",
    "has_stop_desk": 0
  },
  "1221": {
    "nom": "Sedrata",
    "wilaya_id": 41,
    "code_postal": "4102",
    "has_stop_desk": 0
  },
  "1222": {
    "nom": "Sedraya",
    "wilaya_id": 26,
    "code_postal": "2661",
    "has_stop_desk": 0
  },
  "1223": {
    "nom": "Sefiane",
    "wilaya_id": 5,
    "code_postal": "524",
    "has_stop_desk": 0
  },
  "1224": {
    "nom": "Seggana",
    "wilaya_id": 5,
    "code_postal": "529",
    "has_stop_desk": 0
  },
  "1225": {
    "nom": "Seghouane",
    "wilaya_id": 26,
    "code_postal": "2648",
    "has_stop_desk": 0
  },
  "1226": {
    "nom": "Sehailia",
    "wilaya_id": 29,
    "code_postal": "2947",
    "has_stop_desk": 0
  },
  "1227": {
    "nom": "Sehala Thaoura",
    "wilaya_id": 22,
    "code_postal": "2239",
    "has_stop_desk": 0
  },
  "1228": {
    "nom": "Sehaoula",
    "wilaya_id": 16,
    "code_postal": "1645",
    "has_stop_desk": 1
  },
  "1229": {
    "nom": "Sellaoua Announa",
    "wilaya_id": 24,
    "code_postal": "2429",
    "has_stop_desk": 0
  },
  "1230": {
    "nom": "Selma Benziada",
    "wilaya_id": 18,
    "code_postal": "1818",
    "has_stop_desk": 0
  },
  "1231": {
    "nom": "Selmana",
    "wilaya_id": 17,
    "code_postal": "1722",
    "has_stop_desk": 0
  },
  "1232": {
    "nom": "Sendjas",
    "wilaya_id": 2,
    "code_postal": "219",
    "has_stop_desk": 0
  },
  "1233": {
    "nom": "Seraidi",
    "wilaya_id": 23,
    "code_postal": "2308",
    "has_stop_desk": 0
  },
  "1234": {
    "nom": "Serdj El Ghoul",
    "wilaya_id": 19,
    "code_postal": "1935",
    "has_stop_desk": 0
  },
  "1235": {
    "nom": "Serghine",
    "wilaya_id": 14,
    "code_postal": "1439",
    "has_stop_desk": 0
  },
  "1236": {
    "nom": "Seriana",
    "wilaya_id": 5,
    "code_postal": "505",
    "has_stop_desk": 0
  },
  "1237": {
    "nom": "Setaouali",
    "wilaya_id": 16,
    "code_postal": "1653",
    "has_stop_desk": 1
  },
  "1238": {
    "nom": "Setif",
    "wilaya_id": 19,
    "code_postal": "1901",
    "has_stop_desk": 0
  },
  "1239": {
    "nom": "Settara",
    "wilaya_id": 18,
    "code_postal": "1811",
    "has_stop_desk": 0
  },
  "1240": {
    "nom": "Sfissef",
    "wilaya_id": 22,
    "code_postal": "2229",
    "has_stop_desk": 0
  },
  "1241": {
    "nom": "Sfissifa",
    "wilaya_id": 45,
    "code_postal": "4505",
    "has_stop_desk": 0
  },
  "1242": {
    "nom": "Si Abdelghani",
    "wilaya_id": 14,
    "code_postal": "1417",
    "has_stop_desk": 0
  },
  "1243": {
    "nom": "Si Mahdjoub",
    "wilaya_id": 26,
    "code_postal": "2644",
    "has_stop_desk": 0
  },
  "1244": {
    "nom": "Si Mustapha",
    "wilaya_id": 35,
    "code_postal": "3511",
    "has_stop_desk": 0
  },
  "1245": {
    "nom": "Sidi Abdelaziz",
    "wilaya_id": 18,
    "code_postal": "1813",
    "has_stop_desk": 0
  },
  "1246": {
    "nom": "Sidi Abdeldjebar",
    "wilaya_id": 29,
    "code_postal": "2946",
    "has_stop_desk": 0
  },
  "1247": {
    "nom": "Sidi Abdelli",
    "wilaya_id": 13,
    "code_postal": "1334",
    "has_stop_desk": 0
  },
  "1248": {
    "nom": "Sidi Abdelmoumene",
    "wilaya_id": 29,
    "code_postal": "2932",
    "has_stop_desk": 0
  },
  "1249": {
    "nom": "Sidi Abderrahmane",
    "wilaya_id": 2,
    "code_postal": "225",
    "has_stop_desk": 0
  },
  "1250": {
    "nom": "Sidi Abderrahmane",
    "wilaya_id": 14,
    "code_postal": "1438",
    "has_stop_desk": 0
  },
  "1251": {
    "nom": "Sidi Abed",
    "wilaya_id": 38,
    "code_postal": "3818",
    "has_stop_desk": 0
  },
  "1252": {
    "nom": "Sidi Ahmed",
    "wilaya_id": 20,
    "code_postal": "2012",
    "has_stop_desk": 0
  },
  "1253": {
    "nom": "Sidi Aich",
    "wilaya_id": 6,
    "code_postal": "639",
    "has_stop_desk": 0
  },
  "1254": {
    "nom": "Sidi Aissa",
    "wilaya_id": 28,
    "code_postal": "2816",
    "has_stop_desk": 0
  },
  "1255": {
    "nom": "Sidi Akkacha",
    "wilaya_id": 2,
    "code_postal": "211",
    "has_stop_desk": 0
  },
  "1256": {
    "nom": "Sidi Ali",
    "wilaya_id": 27,
    "code_postal": "2712",
    "has_stop_desk": 0
  },
  "1257": {
    "nom": "Sidi Ali Benyoub",
    "wilaya_id": 22,
    "code_postal": "2246",
    "has_stop_desk": 0
  },
  "1258": {
    "nom": "Sidi Ali Boussidi",
    "wilaya_id": 22,
    "code_postal": "2208",
    "has_stop_desk": 0
  },
  "1259": {
    "nom": "Sidi Ali Mellal",
    "wilaya_id": 14,
    "code_postal": "1404",
    "has_stop_desk": 0
  },
  "1260": {
    "nom": "Sidi Amar",
    "wilaya_id": 20,
    "code_postal": "2008",
    "has_stop_desk": 0
  },
  "1261": {
    "nom": "Sidi Amar",
    "wilaya_id": 23,
    "code_postal": "2311",
    "has_stop_desk": 0
  },
  "1262": {
    "nom": "Sidi Amar",
    "wilaya_id": 42,
    "code_postal": "4209",
    "has_stop_desk": 0
  },
  "1263": {
    "nom": "Sidi Ameur",
    "wilaya_id": 28,
    "code_postal": "2822",
    "has_stop_desk": 0
  },
  "1264": {
    "nom": "Sidi Ameur",
    "wilaya_id": 32,
    "code_postal": "3218",
    "has_stop_desk": 0
  },
  "1265": {
    "nom": "Sidi Amrane",
    "wilaya_id": 57,
    "code_postal": "5708",
    "has_stop_desk": 0
  },
  "1266": {
    "nom": "Sidi Aoun",
    "wilaya_id": 39,
    "code_postal": "3916",
    "has_stop_desk": 0
  },
  "1267": {
    "nom": "Sidi Ayad",
    "wilaya_id": 6,
    "code_postal": "621",
    "has_stop_desk": 0
  },
  "1268": {
    "nom": "Sidi Baizid",
    "wilaya_id": 17,
    "code_postal": "1712",
    "has_stop_desk": 0
  },
  "1269": {
    "nom": "Sidi Bakhti",
    "wilaya_id": 14,
    "code_postal": "1407",
    "has_stop_desk": 0
  },
  "1270": {
    "nom": "Sidi Bel Abbes",
    "wilaya_id": 22,
    "code_postal": "2201",
    "has_stop_desk": 0
  },
  "1271": {
    "nom": "Sidi Belaattar",
    "wilaya_id": 27,
    "code_postal": "2710",
    "has_stop_desk": 0
  },
  "1272": {
    "nom": "Sidi Ben Adda",
    "wilaya_id": 46,
    "code_postal": "4612",
    "has_stop_desk": 0
  },
  "1273": {
    "nom": "Sidi Ben Yebka",
    "wilaya_id": 31,
    "code_postal": "3122",
    "has_stop_desk": 0
  },
  "1274": {
    "nom": "Sidi Boubekeur",
    "wilaya_id": 20,
    "code_postal": "2009",
    "has_stop_desk": 0
  },
  "1275": {
    "nom": "Sidi Boumediene",
    "wilaya_id": 46,
    "code_postal": "4615",
    "has_stop_desk": 0
  },
  "1276": {
    "nom": "Sidi Boussaid",
    "wilaya_id": 29,
    "code_postal": "2916",
    "has_stop_desk": 0
  },
  "1277": {
    "nom": "Sidi Boutouchent",
    "wilaya_id": 38,
    "code_postal": "3815",
    "has_stop_desk": 0
  },
  "1278": {
    "nom": "Sidi Bouzid",
    "wilaya_id": 3,
    "code_postal": "324",
    "has_stop_desk": 0
  },
  "1279": {
    "nom": "Sidi Brahim",
    "wilaya_id": 22,
    "code_postal": "2203",
    "has_stop_desk": 0
  },
  "1280": {
    "nom": "Sidi Chaib",
    "wilaya_id": 22,
    "code_postal": "2235",
    "has_stop_desk": 0
  },
  "1281": {
    "nom": "Sidi Chami",
    "wilaya_id": 31,
    "code_postal": "3113",
    "has_stop_desk": 0
  },
  "1282": {
    "nom": "Sidi Dahou Zairs",
    "wilaya_id": 22,
    "code_postal": "2236",
    "has_stop_desk": 0
  },
  "1283": {
    "nom": "Sidi Daoud",
    "wilaya_id": 35,
    "code_postal": "3506",
    "has_stop_desk": 0
  },
  "1284": {
    "nom": "Sidi Demed",
    "wilaya_id": 26,
    "code_postal": "2631",
    "has_stop_desk": 0
  },
  "1285": {
    "nom": "Sidi Djilali",
    "wilaya_id": 13,
    "code_postal": "1341",
    "has_stop_desk": 0
  },
  "1286": {
    "nom": "Sidi Embarek",
    "wilaya_id": 34,
    "code_postal": "3410",
    "has_stop_desk": 0
  },
  "1287": {
    "nom": "Sidi Fredj",
    "wilaya_id": 41,
    "code_postal": "4120",
    "has_stop_desk": 0
  },
  "1288": {
    "nom": "Sidi Ghiles",
    "wilaya_id": 42,
    "code_postal": "4221",
    "has_stop_desk": 0
  },
  "1289": {
    "nom": "Sidi Hadjeres",
    "wilaya_id": 28,
    "code_postal": "2818",
    "has_stop_desk": 0
  },
  "1290": {
    "nom": "Sidi Hamadouche",
    "wilaya_id": 22,
    "code_postal": "2241",
    "has_stop_desk": 0
  },
  "1291": {
    "nom": "Sidi Hosni",
    "wilaya_id": 14,
    "code_postal": "1423",
    "has_stop_desk": 0
  },
  "1292": {
    "nom": "Sidi Kada",
    "wilaya_id": 29,
    "code_postal": "2908",
    "has_stop_desk": 0
  },
  "1293": {
    "nom": "Sidi Khaled",
    "wilaya_id": 22,
    "code_postal": "2227",
    "has_stop_desk": 0
  },
  "1294": {
    "nom": "Sidi Khaled",
    "wilaya_id": 51,
    "code_postal": "5104",
    "has_stop_desk": 0
  },
  "1295": {
    "nom": "Sidi Khelifa",
    "wilaya_id": 43,
    "code_postal": "4327",
    "has_stop_desk": 0
  },
  "1296": {
    "nom": "Sidi Khelil",
    "wilaya_id": 57,
    "code_postal": "5704",
    "has_stop_desk": 0
  },
  "1297": {
    "nom": "Sidi Khettab",
    "wilaya_id": 48,
    "code_postal": "4810",
    "has_stop_desk": 0
  },
  "1298": {
    "nom": "Sidi Khouiled",
    "wilaya_id": 30,
    "code_postal": "3011",
    "has_stop_desk": 0
  },
  "1299": {
    "nom": "Sidi Ladjel",
    "wilaya_id": 17,
    "code_postal": "1719",
    "has_stop_desk": 0
  },
  "1300": {
    "nom": "Sidi Lahcene",
    "wilaya_id": 22,
    "code_postal": "2214",
    "has_stop_desk": 0
  },
  "1301": {
    "nom": "Sidi Lakhdar",
    "wilaya_id": 27,
    "code_postal": "2716",
    "has_stop_desk": 0
  },
  "1302": {
    "nom": "Sidi Lakhdar",
    "wilaya_id": 44,
    "code_postal": "4424",
    "has_stop_desk": 0
  },
  "1303": {
    "nom": "Sidi Lantri",
    "wilaya_id": 38,
    "code_postal": "3808",
    "has_stop_desk": 0
  },
  "1304": {
    "nom": "Sidi Lazreg",
    "wilaya_id": 48,
    "code_postal": "4806",
    "has_stop_desk": 0
  },
  "1305": {
    "nom": "Sidi M'hamed",
    "wilaya_id": 16,
    "code_postal": "1602",
    "has_stop_desk": 1
  },
  "1306": {
    "nom": "Sidi M'hamed",
    "wilaya_id": 28,
    "code_postal": "2838",
    "has_stop_desk": 0
  },
  "1307": {
    "nom": "Sidi M'hamed Benali",
    "wilaya_id": 48,
    "code_postal": "4808",
    "has_stop_desk": 0
  },
  "1308": {
    "nom": "Sidi M'hamed Benaouda",
    "wilaya_id": 48,
    "code_postal": "4818",
    "has_stop_desk": 0
  },
  "1309": {
    "nom": "Sidi Makhlouf",
    "wilaya_id": 3,
    "code_postal": "304",
    "has_stop_desk": 0
  },
  "1310": {
    "nom": "Sidi Marouf",
    "wilaya_id": 18,
    "code_postal": "1810",
    "has_stop_desk": 0
  },
  "1311": {
    "nom": "Sidi Medjahed",
    "wilaya_id": 13,
    "code_postal": "1337",
    "has_stop_desk": 0
  },
  "1312": {
    "nom": "Sidi Merouane",
    "wilaya_id": 43,
    "code_postal": "4318",
    "has_stop_desk": 0
  },
  "1313": {
    "nom": "Sidi Mezghiche",
    "wilaya_id": 21,
    "code_postal": "2119",
    "has_stop_desk": 0
  },
  "1314": {
    "nom": "Sidi Moussa",
    "wilaya_id": 16,
    "code_postal": "1637",
    "has_stop_desk": 1
  },
  "1315": {
    "nom": "Sidi Naamane",
    "wilaya_id": 15,
    "code_postal": "1559",
    "has_stop_desk": 0
  },
  "1316": {
    "nom": "Sidi Naamane",
    "wilaya_id": 26,
    "code_postal": "2626",
    "has_stop_desk": 0
  },
  "1317": {
    "nom": "Sidi Okba",
    "wilaya_id": 7,
    "code_postal": "711",
    "has_stop_desk": 0
  },
  "1318": {
    "nom": "Sidi Ouriache",
    "wilaya_id": 46,
    "code_postal": "4626",
    "has_stop_desk": 0
  },
  "1319": {
    "nom": "Sidi Rabie",
    "wilaya_id": 26,
    "code_postal": "2655",
    "has_stop_desk": 0
  },
  "1320": {
    "nom": "Sidi Rached",
    "wilaya_id": 42,
    "code_postal": "4223",
    "has_stop_desk": 0
  },
  "1321": {
    "nom": "Sidi Saada",
    "wilaya_id": 48,
    "code_postal": "4804",
    "has_stop_desk": 0
  },
  "1322": {
    "nom": "Sidi Safi",
    "wilaya_id": 46,
    "code_postal": "4624",
    "has_stop_desk": 0
  },
  "1323": {
    "nom": "Sidi Sandel",
    "wilaya_id": 24,
    "code_postal": "2407",
    "has_stop_desk": 0
  },
  "1324": {
    "nom": "Sidi Semiane",
    "wilaya_id": 42,
    "code_postal": "4226",
    "has_stop_desk": 0
  },
  "1325": {
    "nom": "Sidi Slimane",
    "wilaya_id": 32,
    "code_postal": "3221",
    "has_stop_desk": 0
  },
  "1326": {
    "nom": "Sidi Slimane",
    "wilaya_id": 38,
    "code_postal": "3820",
    "has_stop_desk": 0
  },
  "1327": {
    "nom": "Sidi Slimane",
    "wilaya_id": 55,
    "code_postal": "5506",
    "has_stop_desk": 0
  },
  "1328": {
    "nom": "Sidi Tifour",
    "wilaya_id": 32,
    "code_postal": "3222",
    "has_stop_desk": 0
  },
  "1329": {
    "nom": "Sidi Yacoub",
    "wilaya_id": 22,
    "code_postal": "2240",
    "has_stop_desk": 0
  },
  "1330": {
    "nom": "Sidi Zahar",
    "wilaya_id": 26,
    "code_postal": "2628",
    "has_stop_desk": 0
  },
  "1331": {
    "nom": "Sidi Ziane",
    "wilaya_id": 26,
    "code_postal": "2614",
    "has_stop_desk": 0
  },
  "1332": {
    "nom": "Sig",
    "wilaya_id": 29,
    "code_postal": "2926",
    "has_stop_desk": 0
  },
  "1333": {
    "nom": "Sigus",
    "wilaya_id": 4,
    "code_postal": "406",
    "has_stop_desk": 0
  },
  "1334": {
    "nom": "Sirat",
    "wilaya_id": 27,
    "code_postal": "2720",
    "has_stop_desk": 0
  },
  "1335": {
    "nom": "Skikda",
    "wilaya_id": 21,
    "code_postal": "2101",
    "has_stop_desk": 0
  },
  "1336": {
    "nom": "Slim",
    "wilaya_id": 28,
    "code_postal": "2843",
    "has_stop_desk": 0
  },
  "1337": {
    "nom": "Smaoun",
    "wilaya_id": 6,
    "code_postal": "612",
    "has_stop_desk": 0
  },
  "1338": {
    "nom": "Sobha",
    "wilaya_id": 2,
    "code_postal": "208",
    "has_stop_desk": 0
  },
  "1339": {
    "nom": "Souaflia",
    "wilaya_id": 27,
    "code_postal": "2724",
    "has_stop_desk": 0
  },
  "1340": {
    "nom": "Souagui",
    "wilaya_id": 26,
    "code_postal": "2633",
    "has_stop_desk": 0
  },
  "1341": {
    "nom": "Souahlia",
    "wilaya_id": 13,
    "code_postal": "1329",
    "has_stop_desk": 0
  },
  "1342": {
    "nom": "Souamaa",
    "wilaya_id": 15,
    "code_postal": "1505",
    "has_stop_desk": 0
  },
  "1343": {
    "nom": "Souamaa",
    "wilaya_id": 28,
    "code_postal": "2840",
    "has_stop_desk": 0
  },
  "1344": {
    "nom": "Souani",
    "wilaya_id": 13,
    "code_postal": "1308",
    "has_stop_desk": 0
  },
  "1345": {
    "nom": "Souarekh",
    "wilaya_id": 36,
    "code_postal": "3609",
    "has_stop_desk": 0
  },
  "1346": {
    "nom": "Sougueur",
    "wilaya_id": 14,
    "code_postal": "1416",
    "has_stop_desk": 0
  },
  "1347": {
    "nom": "Souhane",
    "wilaya_id": 9,
    "code_postal": "913",
    "has_stop_desk": 1
  },
  "1348": {
    "nom": "Souidania",
    "wilaya_id": 16,
    "code_postal": "1655",
    "has_stop_desk": 1
  },
  "1349": {
    "nom": "Souk Ahras",
    "wilaya_id": 41,
    "code_postal": "4101",
    "has_stop_desk": 0
  },
  "1350": {
    "nom": "Souk El Haad",
    "wilaya_id": 35,
    "code_postal": "3526",
    "has_stop_desk": 0
  },
  "1351": {
    "nom": "Souk El Had",
    "wilaya_id": 48,
    "code_postal": "4831",
    "has_stop_desk": 0
  },
  "1352": {
    "nom": "Souk El Khemis",
    "wilaya_id": 10,
    "code_postal": "1004",
    "has_stop_desk": 0
  },
  "1353": {
    "nom": "Souk El Tenine",
    "wilaya_id": 6,
    "code_postal": "608",
    "has_stop_desk": 0
  },
  "1354": {
    "nom": "Souk El Thenine",
    "wilaya_id": 15,
    "code_postal": "1557",
    "has_stop_desk": 0
  },
  "1355": {
    "nom": "Souk Naamane",
    "wilaya_id": 4,
    "code_postal": "417",
    "has_stop_desk": 0
  },
  "1356": {
    "nom": "Souk Oufella",
    "wilaya_id": 6,
    "code_postal": "630",
    "has_stop_desk": 0
  },
  "1357": {
    "nom": "Souk Tleta",
    "wilaya_id": 13,
    "code_postal": "1333",
    "has_stop_desk": 0
  },
  "1358": {
    "nom": "Souma",
    "wilaya_id": 9,
    "code_postal": "911",
    "has_stop_desk": 1
  },
  "1359": {
    "nom": "Sour",
    "wilaya_id": 27,
    "code_postal": "2708",
    "has_stop_desk": 0
  },
  "1360": {
    "nom": "Sour El Ghozlane",
    "wilaya_id": 10,
    "code_postal": "1038",
    "has_stop_desk": 0
  },
  "1361": {
    "nom": "Stah Guentis",
    "wilaya_id": 12,
    "code_postal": "1204",
    "has_stop_desk": 0
  },
  "1362": {
    "nom": "Stidia",
    "wilaya_id": 27,
    "code_postal": "2704",
    "has_stop_desk": 0
  },
  "1363": {
    "nom": "Still",
    "wilaya_id": 57,
    "code_postal": "5702",
    "has_stop_desk": 0
  },
  "1364": {
    "nom": "Stitten",
    "wilaya_id": 32,
    "code_postal": "3203",
    "has_stop_desk": 0
  },
  "1365": {
    "nom": "T Kout",
    "wilaya_id": 5,
    "code_postal": "544",
    "has_stop_desk": 0
  },
  "1366": {
    "nom": "Tabelbala",
    "wilaya_id": 52,
    "code_postal": "5206",
    "has_stop_desk": 0
  },
  "1367": {
    "nom": "Tabia",
    "wilaya_id": 22,
    "code_postal": "2221",
    "has_stop_desk": 0
  },
  "1368": {
    "nom": "Tablat",
    "wilaya_id": 26,
    "code_postal": "2652",
    "has_stop_desk": 0
  },
  "1369": {
    "nom": "Tacheta Zegagha",
    "wilaya_id": 44,
    "code_postal": "4432",
    "has_stop_desk": 0
  },
  "1370": {
    "nom": "Tachouda",
    "wilaya_id": 19,
    "code_postal": "1945",
    "has_stop_desk": 0
  },
  "1371": {
    "nom": "Tadjemout",
    "wilaya_id": 3,
    "code_postal": "308",
    "has_stop_desk": 0
  },
  "1372": {
    "nom": "Tadjena",
    "wilaya_id": 2,
    "code_postal": "205",
    "has_stop_desk": 0
  },
  "1373": {
    "nom": "Tadjenanet",
    "wilaya_id": 43,
    "code_postal": "4308",
    "has_stop_desk": 0
  },
  "1374": {
    "nom": "Tadjrouna",
    "wilaya_id": 3,
    "code_postal": "318",
    "has_stop_desk": 0
  },
  "1375": {
    "nom": "Tadmait",
    "wilaya_id": 15,
    "code_postal": "1564",
    "has_stop_desk": 0
  },
  "1376": {
    "nom": "Tadmit",
    "wilaya_id": 17,
    "code_postal": "1736",
    "has_stop_desk": 0
  },
  "1377": {
    "nom": "Tafissour",
    "wilaya_id": 22,
    "code_postal": "2211",
    "has_stop_desk": 0
  },
  "1378": {
    "nom": "Tafraoui",
    "wilaya_id": 31,
    "code_postal": "3112",
    "has_stop_desk": 0
  },
  "1379": {
    "nom": "Tafraout",
    "wilaya_id": 26,
    "code_postal": "2623",
    "has_stop_desk": 0
  },
  "1380": {
    "nom": "Tafreg",
    "wilaya_id": 34,
    "code_postal": "3424",
    "has_stop_desk": 0
  },
  "1381": {
    "nom": "Tagdemt",
    "wilaya_id": 14,
    "code_postal": "1432",
    "has_stop_desk": 0
  },
  "1382": {
    "nom": "Taghit",
    "wilaya_id": 8,
    "code_postal": "813",
    "has_stop_desk": 0
  },
  "1383": {
    "nom": "Taghzout",
    "wilaya_id": 10,
    "code_postal": "1009",
    "has_stop_desk": 0
  },
  "1384": {
    "nom": "Taghzout",
    "wilaya_id": 39,
    "code_postal": "3910",
    "has_stop_desk": 0
  },
  "1385": {
    "nom": "Taglait",
    "wilaya_id": 34,
    "code_postal": "3421",
    "has_stop_desk": 0
  },
  "1386": {
    "nom": "Taguedite",
    "wilaya_id": 10,
    "code_postal": "1028",
    "has_stop_desk": 0
  },
  "1387": {
    "nom": "Taher",
    "wilaya_id": 18,
    "code_postal": "1805",
    "has_stop_desk": 0
  },
  "1388": {
    "nom": "Taibet",
    "wilaya_id": 55,
    "code_postal": "5508",
    "has_stop_desk": 0
  },
  "1389": {
    "nom": "Takhemaret",
    "wilaya_id": 14,
    "code_postal": "1437",
    "has_stop_desk": 0
  },
  "1390": {
    "nom": "Tala Hamza",
    "wilaya_id": 6,
    "code_postal": "633",
    "has_stop_desk": 0
  },
  "1391": {
    "nom": "Tala Ifacene",
    "wilaya_id": 19,
    "code_postal": "1942",
    "has_stop_desk": 0
  },
  "1392": {
    "nom": "Talassa",
    "wilaya_id": 2,
    "code_postal": "214",
    "has_stop_desk": 0
  },
  "1393": {
    "nom": "Taleb Larbi",
    "wilaya_id": 39,
    "code_postal": "3914",
    "has_stop_desk": 0
  },
  "1394": {
    "nom": "Talkhamt",
    "wilaya_id": 5,
    "code_postal": "534",
    "has_stop_desk": 0
  },
  "1395": {
    "nom": "Talmine",
    "wilaya_id": 49,
    "code_postal": "4909",
    "has_stop_desk": 0
  },
  "1396": {
    "nom": "Tamalous",
    "wilaya_id": 21,
    "code_postal": "2126",
    "has_stop_desk": 0
  },
  "1397": {
    "nom": "Tamanrasset",
    "wilaya_id": 11,
    "code_postal": "1101",
    "has_stop_desk": 0
  },
  "1398": {
    "nom": "Tamantit",
    "wilaya_id": 1,
    "code_postal": "114",
    "has_stop_desk": 0
  },
  "1399": {
    "nom": "Tamellalet",
    "wilaya_id": 38,
    "code_postal": "3819",
    "has_stop_desk": 0
  },
  "1400": {
    "nom": "Tamesguida",
    "wilaya_id": 26,
    "code_postal": "2615",
    "has_stop_desk": 0
  },
  "1401": {
    "nom": "Tamest",
    "wilaya_id": 1,
    "code_postal": "102",
    "has_stop_desk": 0
  },
  "1402": {
    "nom": "Tamlouka",
    "wilaya_id": 24,
    "code_postal": "2405",
    "has_stop_desk": 0
  },
  "1403": {
    "nom": "Tamokra",
    "wilaya_id": 6,
    "code_postal": "606",
    "has_stop_desk": 0
  },
  "1404": {
    "nom": "Tamridjet",
    "wilaya_id": 6,
    "code_postal": "646",
    "has_stop_desk": 0
  },
  "1405": {
    "nom": "Tamsa",
    "wilaya_id": 28,
    "code_postal": "2823",
    "has_stop_desk": 0
  },
  "1406": {
    "nom": "Tamtert",
    "wilaya_id": 52,
    "code_postal": "5210",
    "has_stop_desk": 0
  },
  "1407": {
    "nom": "Tamza",
    "wilaya_id": 40,
    "code_postal": "4014",
    "has_stop_desk": 0
  },
  "1408": {
    "nom": "Tamzoura",
    "wilaya_id": 46,
    "code_postal": "4610",
    "has_stop_desk": 0
  },
  "1409": {
    "nom": "Taoudmout",
    "wilaya_id": 22,
    "code_postal": "2249",
    "has_stop_desk": 0
  },
  "1410": {
    "nom": "Taougrite",
    "wilaya_id": 2,
    "code_postal": "206",
    "has_stop_desk": 0
  },
  "1411": {
    "nom": "Taouiala",
    "wilaya_id": 3,
    "code_postal": "317",
    "has_stop_desk": 0
  },
  "1412": {
    "nom": "Taoura",
    "wilaya_id": 41,
    "code_postal": "4108",
    "has_stop_desk": 0
  },
  "1413": {
    "nom": "Taourga",
    "wilaya_id": 35,
    "code_postal": "3520",
    "has_stop_desk": 0
  },
  "1414": {
    "nom": "Taourirt",
    "wilaya_id": 10,
    "code_postal": "1043",
    "has_stop_desk": 0
  },
  "1415": {
    "nom": "Taourit Ighil",
    "wilaya_id": 6,
    "code_postal": "604",
    "has_stop_desk": 0
  },
  "1416": {
    "nom": "Taouzianat",
    "wilaya_id": 40,
    "code_postal": "4007",
    "has_stop_desk": 0
  },
  "1417": {
    "nom": "Tarik Ibn Ziad",
    "wilaya_id": 44,
    "code_postal": "4421",
    "has_stop_desk": 0
  },
  "1418": {
    "nom": "Tarmount",
    "wilaya_id": 28,
    "code_postal": "2805",
    "has_stop_desk": 0
  },
  "1419": {
    "nom": "Taskriout",
    "wilaya_id": 6,
    "code_postal": "631",
    "has_stop_desk": 0
  },
  "1420": {
    "nom": "Tassadane Haddada",
    "wilaya_id": 43,
    "code_postal": "4319",
    "has_stop_desk": 0
  },
  "1421": {
    "nom": "Taxlent",
    "wilaya_id": 5,
    "code_postal": "538",
    "has_stop_desk": 0
  },
  "1422": {
    "nom": "Taya",
    "wilaya_id": 19,
    "code_postal": "1958",
    "has_stop_desk": 0
  },
  "1423": {
    "nom": "Tazgait",
    "wilaya_id": 27,
    "code_postal": "2729",
    "has_stop_desk": 0
  },
  "1424": {
    "nom": "Tazmalt",
    "wilaya_id": 6,
    "code_postal": "627",
    "has_stop_desk": 0
  },
  "1425": {
    "nom": "Tazoult",
    "wilaya_id": 5,
    "code_postal": "508",
    "has_stop_desk": 0
  },
  "1426": {
    "nom": "Tazrouk",
    "wilaya_id": 11,
    "code_postal": "1106",
    "has_stop_desk": 0
  },
  "1427": {
    "nom": "Tebesbest",
    "wilaya_id": 55,
    "code_postal": "5503",
    "has_stop_desk": 0
  },
  "1428": {
    "nom": "Tebessa",
    "wilaya_id": 12,
    "code_postal": "1201",
    "has_stop_desk": 0
  },
  "1429": {
    "nom": "Teghalimet",
    "wilaya_id": 22,
    "code_postal": "2244",
    "has_stop_desk": 0
  },
  "1430": {
    "nom": "Telagh",
    "wilaya_id": 22,
    "code_postal": "2205",
    "has_stop_desk": 0
  },
  "1431": {
    "nom": "Teleghma",
    "wilaya_id": 43,
    "code_postal": "4306",
    "has_stop_desk": 0
  },
  "1432": {
    "nom": "Telidjen",
    "wilaya_id": 12,
    "code_postal": "1222",
    "has_stop_desk": 0
  },
  "1433": {
    "nom": "Tella",
    "wilaya_id": 19,
    "code_postal": "1960",
    "has_stop_desk": 0
  },
  "1434": {
    "nom": "Temacine",
    "wilaya_id": 55,
    "code_postal": "5509",
    "has_stop_desk": 0
  },
  "1435": {
    "nom": "Tenedla",
    "wilaya_id": 57,
    "code_postal": "5705",
    "has_stop_desk": 0
  },
  "1436": {
    "nom": "Tenes",
    "wilaya_id": 2,
    "code_postal": "202",
    "has_stop_desk": 0
  },
  "1437": {
    "nom": "Teniet El Abed",
    "wilaya_id": 5,
    "code_postal": "547",
    "has_stop_desk": 0
  },
  "1438": {
    "nom": "Teniet En Nasr",
    "wilaya_id": 34,
    "code_postal": "3414",
    "has_stop_desk": 0
  },
  "1439": {
    "nom": "Tenira",
    "wilaya_id": 22,
    "code_postal": "2217",
    "has_stop_desk": 0
  },
  "1440": {
    "nom": "Terga",
    "wilaya_id": 46,
    "code_postal": "4608",
    "has_stop_desk": 0
  },
  "1441": {
    "nom": "Terny Beni Hediel",
    "wilaya_id": 13,
    "code_postal": "1323",
    "has_stop_desk": 0
  },
  "1442": {
    "nom": "Terraguelt",
    "wilaya_id": 41,
    "code_postal": "4125",
    "has_stop_desk": 0
  },
  "1443": {
    "nom": "Terrai Bainem",
    "wilaya_id": 43,
    "code_postal": "4323",
    "has_stop_desk": 0
  },
  "1444": {
    "nom": "Tesmart",
    "wilaya_id": 34,
    "code_postal": "3429",
    "has_stop_desk": 0
  },
  "1445": {
    "nom": "Tessala",
    "wilaya_id": 22,
    "code_postal": "2202",
    "has_stop_desk": 0
  },
  "1446": {
    "nom": "Tessala",
    "wilaya_id": 43,
    "code_postal": "4316",
    "has_stop_desk": 0
  },
  "1447": {
    "nom": "Tessala El Merdja",
    "wilaya_id": 16,
    "code_postal": "1634",
    "has_stop_desk": 1
  },
  "1448": {
    "nom": "Texena",
    "wilaya_id": 18,
    "code_postal": "1824",
    "has_stop_desk": 0
  },
  "1449": {
    "nom": "Thenia",
    "wilaya_id": 35,
    "code_postal": "3514",
    "has_stop_desk": 0
  },
  "1450": {
    "nom": "Theniet El Had",
    "wilaya_id": 38,
    "code_postal": "3803",
    "has_stop_desk": 0
  },
  "1451": {
    "nom": "Tianet",
    "wilaya_id": 13,
    "code_postal": "1345",
    "has_stop_desk": 0
  },
  "1452": {
    "nom": "Tiaret",
    "wilaya_id": 14,
    "code_postal": "1401",
    "has_stop_desk": 0
  },
  "1453": {
    "nom": "Tibane",
    "wilaya_id": 6,
    "code_postal": "632",
    "has_stop_desk": 0
  },
  "1454": {
    "nom": "Tiberguent",
    "wilaya_id": 43,
    "code_postal": "4313",
    "has_stop_desk": 0
  },
  "1455": {
    "nom": "Tiberkanine",
    "wilaya_id": 44,
    "code_postal": "4435",
    "has_stop_desk": 0
  },
  "1456": {
    "nom": "Tichy",
    "wilaya_id": 6,
    "code_postal": "611",
    "has_stop_desk": 0
  },
  "1457": {
    "nom": "Tidda",
    "wilaya_id": 14,
    "code_postal": "1442",
    "has_stop_desk": 0
  },
  "1458": {
    "nom": "Tidjelabine",
    "wilaya_id": 35,
    "code_postal": "3512",
    "has_stop_desk": 0
  },
  "1459": {
    "nom": "Tiffech",
    "wilaya_id": 41,
    "code_postal": "4106",
    "has_stop_desk": 0
  },
  "1460": {
    "nom": "Tifra",
    "wilaya_id": 6,
    "code_postal": "614",
    "has_stop_desk": 0
  },
  "1461": {
    "nom": "Tighanimine",
    "wilaya_id": 5,
    "code_postal": "526",
    "has_stop_desk": 0
  },
  "1462": {
    "nom": "Tigharghar",
    "wilaya_id": 5,
    "code_postal": "521",
    "has_stop_desk": 0
  },
  "1463": {
    "nom": "Tighennif",
    "wilaya_id": 29,
    "code_postal": "2906",
    "has_stop_desk": 0
  },
  "1464": {
    "nom": "Tigzirt",
    "wilaya_id": 15,
    "code_postal": "1538",
    "has_stop_desk": 0
  },
  "1465": {
    "nom": "Tilatou",
    "wilaya_id": 5,
    "code_postal": "518",
    "has_stop_desk": 0
  },
  "1466": {
    "nom": "Tilmouni",
    "wilaya_id": 22,
    "code_postal": "2213",
    "has_stop_desk": 0
  },
  "1467": {
    "nom": "Timekten",
    "wilaya_id": 1,
    "code_postal": "113",
    "has_stop_desk": 0
  },
  "1468": {
    "nom": "Timezrit",
    "wilaya_id": 6,
    "code_postal": "607",
    "has_stop_desk": 0
  },
  "1469": {
    "nom": "Timezrit",
    "wilaya_id": 35,
    "code_postal": "3515",
    "has_stop_desk": 0
  },
  "1470": {
    "nom": "Timgad",
    "wilaya_id": 5,
    "code_postal": "550",
    "has_stop_desk": 0
  },
  "1471": {
    "nom": "Timiaouine",
    "wilaya_id": 50,
    "code_postal": "5002",
    "has_stop_desk": 0
  },
  "1472": {
    "nom": "Timimoun",
    "wilaya_id": 49,
    "code_postal": "4901",
    "has_stop_desk": 0
  },
  "1473": {
    "nom": "Timizart",
    "wilaya_id": 15,
    "code_postal": "1508",
    "has_stop_desk": 0
  },
  "1474": {
    "nom": "Timoudi",
    "wilaya_id": 52,
    "code_postal": "5203",
    "has_stop_desk": 0
  },
  "1475": {
    "nom": "Tin Zouatine",
    "wilaya_id": 54,
    "code_postal": "5402",
    "has_stop_desk": 0
  },
  "1476": {
    "nom": "Tindouf",
    "wilaya_id": 37,
    "code_postal": "3701",
    "has_stop_desk": 0
  },
  "1477": {
    "nom": "Tinebdar",
    "wilaya_id": 6,
    "code_postal": "610",
    "has_stop_desk": 0
  },
  "1478": {
    "nom": "Tinerkouk",
    "wilaya_id": 49,
    "code_postal": "4905",
    "has_stop_desk": 0
  },
  "1479": {
    "nom": "Tiout",
    "wilaya_id": 45,
    "code_postal": "4504",
    "has_stop_desk": 0
  },
  "1480": {
    "nom": "Tipaza",
    "wilaya_id": 42,
    "code_postal": "4201",
    "has_stop_desk": 0
  },
  "1481": {
    "nom": "Tircine",
    "wilaya_id": 20,
    "code_postal": "2015",
    "has_stop_desk": 0
  },
  "1482": {
    "nom": "Tirmitine",
    "wilaya_id": 15,
    "code_postal": "1543",
    "has_stop_desk": 0
  },
  "1483": {
    "nom": "Tissemsilt",
    "wilaya_id": 38,
    "code_postal": "3801",
    "has_stop_desk": 0
  },
  "1484": {
    "nom": "Tit",
    "wilaya_id": 1,
    "code_postal": "106",
    "has_stop_desk": 0
  },
  "1485": {
    "nom": "Tixter",
    "wilaya_id": 34,
    "code_postal": "3426",
    "has_stop_desk": 0
  },
  "1486": {
    "nom": "Tizi",
    "wilaya_id": 29,
    "code_postal": "2903",
    "has_stop_desk": 0
  },
  "1487": {
    "nom": "Tizi Ghenif",
    "wilaya_id": 15,
    "code_postal": "1511",
    "has_stop_desk": 0
  },
  "1488": {
    "nom": "Tizi N'bechar",
    "wilaya_id": 19,
    "code_postal": "1938",
    "has_stop_desk": 0
  },
  "1489": {
    "nom": "Tizi N'berber",
    "wilaya_id": 6,
    "code_postal": "649",
    "has_stop_desk": 0
  },
  "1490": {
    "nom": "Tizi N'tleta",
    "wilaya_id": 15,
    "code_postal": "1551",
    "has_stop_desk": 0
  },
  "1491": {
    "nom": "Tizi Ouzou",
    "wilaya_id": 15,
    "code_postal": "1501",
    "has_stop_desk": 0
  },
  "1492": {
    "nom": "Tizi Rached",
    "wilaya_id": 15,
    "code_postal": "1522",
    "has_stop_desk": 0
  },
  "1493": {
    "nom": "Tlemcen",
    "wilaya_id": 13,
    "code_postal": "1301",
    "has_stop_desk": 1
  },
  "1494": {
    "nom": "Tletat Ed Douair",
    "wilaya_id": 26,
    "code_postal": "2645",
    "has_stop_desk": 0
  },
  "1495": {
    "nom": "Tolga",
    "wilaya_id": 7,
    "code_postal": "721",
    "has_stop_desk": 0
  },
  "1496": {
    "nom": "Touahria",
    "wilaya_id": 27,
    "code_postal": "2731",
    "has_stop_desk": 0
  },
  "1497": {
    "nom": "Toudja",
    "wilaya_id": 6,
    "code_postal": "619",
    "has_stop_desk": 0
  },
  "1498": {
    "nom": "Touggourt",
    "wilaya_id": 55,
    "code_postal": "5501",
    "has_stop_desk": 0
  },
  "1499": {
    "nom": "Tousmouline",
    "wilaya_id": 32,
    "code_postal": "3220",
    "has_stop_desk": 0
  },
  "1500": {
    "nom": "Tousnina",
    "wilaya_id": 14,
    "code_postal": "1426",
    "has_stop_desk": 0
  },
  "1501": {
    "nom": "Treat",
    "wilaya_id": 23,
    "code_postal": "2312",
    "has_stop_desk": 0
  },
  "1502": {
    "nom": "Trifaoui",
    "wilaya_id": 39,
    "code_postal": "3917",
    "has_stop_desk": 0
  },
  "1503": {
    "nom": "Tsabit",
    "wilaya_id": 1,
    "code_postal": "108",
    "has_stop_desk": 0
  },
  "1504": {
    "nom": "Yabous",
    "wilaya_id": 40,
    "code_postal": "4019",
    "has_stop_desk": 0
  },
  "1505": {
    "nom": "Yahia Beniguecha",
    "wilaya_id": 43,
    "code_postal": "4331",
    "has_stop_desk": 0
  },
  "1506": {
    "nom": "Yakourene",
    "wilaya_id": 15,
    "code_postal": "1520",
    "has_stop_desk": 0
  },
  "1507": {
    "nom": "Yatafene",
    "wilaya_id": 15,
    "code_postal": "1545",
    "has_stop_desk": 0
  },
  "1508": {
    "nom": "Yellel",
    "wilaya_id": 48,
    "code_postal": "4825",
    "has_stop_desk": 0
  },
  "1509": {
    "nom": "Youb",
    "wilaya_id": 20,
    "code_postal": "2006",
    "has_stop_desk": 0
  },
  "1510": {
    "nom": "Youssoufia",
    "wilaya_id": 38,
    "code_postal": "3814",
    "has_stop_desk": 0
  },
  "1511": {
    "nom": "Z'barbar",
    "wilaya_id": 10,
    "code_postal": "1024",
    "has_stop_desk": 0
  },
  "1512": {
    "nom": "Zaafrane",
    "wilaya_id": 17,
    "code_postal": "1728",
    "has_stop_desk": 0
  },
  "1513": {
    "nom": "Zaarouria",
    "wilaya_id": 41,
    "code_postal": "4107",
    "has_stop_desk": 0
  },
  "1514": {
    "nom": "Zaccar",
    "wilaya_id": 17,
    "code_postal": "1710",
    "has_stop_desk": 0
  },
  "1515": {
    "nom": "Zahana",
    "wilaya_id": 29,
    "code_postal": "2930",
    "has_stop_desk": 0
  },
  "1516": {
    "nom": "Zanet El Beida",
    "wilaya_id": 5,
    "code_postal": "554",
    "has_stop_desk": 0
  },
  "1517": {
    "nom": "Zaouia El Abidia",
    "wilaya_id": 55,
    "code_postal": "5505",
    "has_stop_desk": 0
  },
  "1518": {
    "nom": "Zaouiet Kounta",
    "wilaya_id": 1,
    "code_postal": "111",
    "has_stop_desk": 0
  },
  "1519": {
    "nom": "Zarzour",
    "wilaya_id": 28,
    "code_postal": "2833",
    "has_stop_desk": 0
  },
  "1520": {
    "nom": "Zeboudja",
    "wilaya_id": 2,
    "code_postal": "220",
    "has_stop_desk": 0
  },
  "1521": {
    "nom": "Zeddine",
    "wilaya_id": 44,
    "code_postal": "4417",
    "has_stop_desk": 0
  },
  "1522": {
    "nom": "Zeghaia",
    "wilaya_id": 43,
    "code_postal": "4328",
    "has_stop_desk": 0
  },
  "1523": {
    "nom": "Zekri",
    "wilaya_id": 15,
    "code_postal": "1523",
    "has_stop_desk": 0
  },
  "1524": {
    "nom": "Zelamta",
    "wilaya_id": 29,
    "code_postal": "2909",
    "has_stop_desk": 0
  },
  "1525": {
    "nom": "Zelfana",
    "wilaya_id": 47,
    "code_postal": "4708",
    "has_stop_desk": 0
  },
  "1526": {
    "nom": "Zemmoura",
    "wilaya_id": 48,
    "code_postal": "4812",
    "has_stop_desk": 0
  },
  "1527": {
    "nom": "Zemmouri",
    "wilaya_id": 35,
    "code_postal": "3510",
    "has_stop_desk": 0
  },
  "1528": {
    "nom": "Zenata",
    "wilaya_id": 13,
    "code_postal": "1316",
    "has_stop_desk": 0
  },
  "1529": {
    "nom": "Zeralda",
    "wilaya_id": 16,
    "code_postal": "1644",
    "has_stop_desk": 1
  },
  "1530": {
    "nom": "Zerdezas",
    "wilaya_id": 21,
    "code_postal": "2117",
    "has_stop_desk": 0
  },
  "1531": {
    "nom": "Zeribet El Oued",
    "wilaya_id": 7,
    "code_postal": "715",
    "has_stop_desk": 0
  },
  "1532": {
    "nom": "Zerizer",
    "wilaya_id": 36,
    "code_postal": "3619",
    "has_stop_desk": 0
  },
  "1533": {
    "nom": "Zerouala",
    "wilaya_id": 22,
    "code_postal": "2233",
    "has_stop_desk": 0
  },
  "1534": {
    "nom": "Ziama Mansouria",
    "wilaya_id": 18,
    "code_postal": "1804",
    "has_stop_desk": 0
  },
  "1535": {
    "nom": "Zighoud Youcef",
    "wilaya_id": 25,
    "code_postal": "2504",
    "has_stop_desk": 0
  },
  "1536": {
    "nom": "Zitouna",
    "wilaya_id": 21,
    "code_postal": "2115",
    "has_stop_desk": 0
  },
  "1537": {
    "nom": "Zitouna",
    "wilaya_id": 36,
    "code_postal": "3620",
    "has_stop_desk": 0
  },
  "1538": {
    "nom": "Zmalet El Emir Abdelkade",
    "wilaya_id": 14,
    "code_postal": "1409",
    "has_stop_desk": 0
  },
  "1539": {
    "nom": "Zorg",
    "wilaya_id": 4,
    "code_postal": "418",
    "has_stop_desk": 0
  },
  "1540": {
    "nom": "Zouabi",
    "wilaya_id": 41,
    "code_postal": "4126",
    "has_stop_desk": 0
  },
  "1541": {
    "nom": "Zoubiria",
    "wilaya_id": 26,
    "code_postal": "2634",
    "has_stop_desk": 0
  }
}
GET
Tarifs des prestations
{{url}}/api/v1/get/fees
Ce point de terminaison vous permet de récupérer les tarifs appliqués pour votre compte.
Seuls les wilayas active seront retourné par la requête.
Les tarifs sont appliqués séparément pour les prestations suivantes :
Livraison (a domicile , stop desk)
Pickup (a domicile , stop desk)
Échange (a domicile , stop desk)
Recouvrement (a domicile , stop desk)
Retour (a domicile , stop desk)
Example Request
Tarifs des prestations

curl
curl --location -g '{{url}}/api/v1/get/fees'
200 OK
Example Response
Body
Headers (12)
View More
json
{
  "livraison": [
    {
      "wilaya_id": 1,
      "tarif": "1300",
      "tarif_stopdesk": "900"
    },
    {
