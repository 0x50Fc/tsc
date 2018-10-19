
#include "kk.h"
#include <pthread.h>
#include <queue>

namespace kk
{

_Object::_Object() : _retainCount(0)
{
}

_Object::~_Object()
{

    Atomic *a = atomic();

    if (a != nullptr)
    {
        a->lock();
    }

    std::set<IObject **>::iterator i = _weakObjects.begin();

    while (i != _weakObjects.end())
    {
        IObject **v = *i;
        if (v)
        {
            *v = NULL;
        }
        i++;
    }

    if (a != nullptr)
    {
        a->unlock();
    }
}

void _Object::release()
{
    Atomic *a = atomic();
    if (a != nullptr)
    {
        a->lock();
    }
    _retainCount--;
    if (_retainCount == 0)
    {
        if (a != nullptr)
        {
            a->addObject(this);
        }
        else
        {
            delete this;
        }
    }
    if (a != nullptr)
    {
        a->unlock();
    }
}

void _Object::retain()
{
    Atomic *a = atomic();
    if (a != nullptr)
    {
        a->lock();
    }
    _retainCount++;
    if (a != nullptr)
    {
        a->unlock();
    }
}

int _Object::retainCount()
{
    return _retainCount;
}

void _Object::weak(IObject **ptr)
{
    Atomic *a = atomic();
    if (a != nullptr)
    {
        a->lock();
    }
    _weakObjects.insert(ptr);
    if (a != nullptr)
    {
        a->unlock();
    }
}

void _Object::unWeak(IObject **ptr)
{
    Atomic *a = atomic();
    if (a != nullptr)
    {
        a->lock();
    }
    std::set<IObject **>::iterator i = _weakObjects.find(ptr);
    if (i != _weakObjects.end())
    {
        _weakObjects.erase(i);
    }
    if (a != nullptr)
    {
        a->unlock();
    }
}

static pthread_key_t kScopeCurrent = 0;

Scope::Scope() : _parent(Scope::current())
{
    pthread_setspecific(kScopeCurrent, this);
}

Scope::~Scope()
{
    pthread_setspecific(kScopeCurrent, _parent);

    std::list<IObject *>::iterator i = _objects.begin();

    while (i != _objects.end())
    {
        IObject *v = *i;
        v->release();
        i++;
    }
}

Scope *Scope::parent()
{
    return _parent;
}

void Scope::addObject(IObject *object)
{
    _objects.push_back(object);
    object->retain();
}

Scope *Scope::current()
{
    static pthread_key_t v = 0;
    if (v == 0)
    {
        pthread_key_create(&v, nullptr);
    }
    return (Scope *)pthread_getspecific(v);
}

_Ref::_Ref() : _object(nullptr)
{
}

IObject *_Ref::get()
{
    return _object;
}

_Weak::_Weak() : _Ref()
{
}

_Weak::_Weak(IObject *object) : _Ref()
{
    set(object);
}

void _Weak::set(IObject *object)
{
    if (_object != nullptr)
    {
        _object->unWeak(&_object);
    }
    if (object != nullptr)
    {
        object->weak(&_object);
    }
    _object = object;
}

_Strong::_Strong() : _Ref()
{
}

_Strong::_Strong(IObject *object) : _Ref()
{
    set(object);
}

void _Strong::set(IObject *object)
{
    if (object != nullptr)
    {
        object->retain();
    }
    if (_object != nullptr)
    {
        _object->release();
    }
    _object = object;
}

_Closure::_Closure() : _func(nullptr)
{
}

_Closure::_Closure(Func func) : _func(func)
{
}

_Closure::~_Closure()
{

    std::map<std::string, Any>::iterator i = _locals.begin();

    while (i != _locals.end())
    {
        i->second.release();
        i++;
    }
}

Any _Closure::get(const char *name)
{
    std::map<std::string, Any>::iterator i = _locals.find(name);
    if (i != _locals.end())
    {
        return i->second;
    }
    return Any::Nil;
}

void _Closure::set(const char *name, Any value)
{
    std::map<std::string, Any>::iterator i = _locals.find(name);
    if (i == _locals.end())
    {
        _locals[name] = value;
        value.retain();
    }
}

Func _Closure::func()
{
    return _func;
}

Any::Any() : _type(TypeNil), _objectValue(nullptr)
{
}

Any::Any(const Any &v) : _type(v._type), _objectValue(v._objectValue), _stringValue(v._stringValue)
{
}

Any::Any(const String &v) : _type(TypeString), _stringValue(v), _objectValue(nullptr)
{
}

Any::Any(const char *v) : _type(TypeString), _stringValue(v), _objectValue(nullptr)
{
}

Any::Any(Int32 v) : _type(TypeInt32), _int32Value(v)
{
}

Any::Any(Int64 v) : _type(TypeInt64), _int64Value(v)
{
}

Any::Any(Uint32 v) : _type(TypeUint32), _uint32Value(v)
{
}

Any::Any(Uint64 v) : _type(TypeUint64), _uint64Value(v)
{
}

Any::Any(Number v) : _type(TypeNumber), _numberValue(v)
{
}
Any::Any(Boolean v) : _type(TypeBoolean), _booleanValue(v)
{
}

Any::Any(IObject *v) : _type(TypeObject), _objectValue(v)
{
}

Any::Any(_Closure *v) : _type(TypeFunction), _functionValue(v)
{
}

Any &Any::operator=(kk::String &v)
{
    _type = TypeString;
    _stringValue = v;
    _objectValue = nullptr;
    return *this;
}

void Any::retain()
{
    if (_type == TypeObject)
    {
        if (_objectValue != nullptr)
        {
            _objectValue->retain();
        }
    }
    else if (_type == TypeFunction)
    {
        if (_functionValue != nullptr)
        {
            _functionValue->retain();
        }
    }
}

void Any::release()
{
    if (_type == TypeObject)
    {
        if (_objectValue != nullptr)
        {
            _objectValue->release();
        }
    }
    else if (_type == TypeFunction)
    {
        if (_functionValue != nullptr)
        {
            _functionValue->release();
        }
    }
}

Any::operator kk::Int()
{
    switch (_type)
    {
    case TypeInt32:
        return _int32Value;
    case TypeInt64:
        return _int64Value;
    case TypeUint32:
        return _uint32Value;
    case TypeUint64:
        return _uint64Value;
    case TypeBoolean:
        return _booleanValue;
    case TypeNumber:
        return _numberValue;
    case TypeString:
        return atoi(_stringValue.c_str());
    default:
        break;
    }
    return 0;
}

Any::operator kk::Uint32()
{
    switch (_type)
    {
    case TypeInt32:
        return _int32Value;
    case TypeInt64:
        return _int64Value;
    case TypeUint32:
        return _uint32Value;
    case TypeUint64:
        return _uint64Value;
    case TypeBoolean:
        return _booleanValue;
    case TypeNumber:
        return _numberValue;
    case TypeString:
        return atol(_stringValue.c_str());
    default:
        break;
    }
    return 0;
}

Any::operator kk::Int64()
{
    switch (_type)
    {
    case TypeInt32:
        return _int32Value;
    case TypeInt64:
        return _int64Value;
    case TypeUint32:
        return _uint32Value;
    case TypeUint64:
        return _uint64Value;
    case TypeBoolean:
        return _booleanValue;
    case TypeNumber:
        return _numberValue;
    case TypeString:
        return atoll(_stringValue.c_str());
    default:
        break;
    }
    return 0;
}
Any::operator kk::Uint64()
{
    switch (_type)
    {
    case TypeInt32:
        return _int32Value;
    case TypeInt64:
        return _int64Value;
    case TypeUint32:
        return _uint32Value;
    case TypeUint64:
        return _uint64Value;
    case TypeBoolean:
        return _booleanValue;
    case TypeNumber:
        return _numberValue;
    case TypeString:
        return atoll(_stringValue.c_str());
    default:
        break;
    }
    return 0;
}
Any::operator kk::Number()
{
    switch (_type)
    {
    case TypeInt32:
        return _int32Value;
    case TypeInt64:
        return _int64Value;
    case TypeUint32:
        return _uint32Value;
    case TypeUint64:
        return _uint64Value;
    case TypeBoolean:
        return _booleanValue;
    case TypeNumber:
        return _numberValue;
    case TypeString:
        return atof(_stringValue.c_str());
    default:
        break;
    }
    return 0;
}

Any::operator kk::Boolean()
{
    switch (_type)
    {
    case TypeInt32:
        return _int32Value != 0;
    case TypeInt64:
        return _int64Value != 0;
    case TypeUint32:
        return _uint32Value != 0;
    case TypeUint64:
        return _uint64Value != 0;
    case TypeBoolean:
        return _booleanValue != 0;
    case TypeNumber:
        return _numberValue != 0;
    case TypeString:
        return !_stringValue.empty();
    default:
        break;
    }
    return false;
}

Any::operator kk::String()
{
    String v;
    switch (_type)
    {
    case TypeInt32:
    {
        char data[255];
        snprintf(data, sizeof(data), "%d", _int32Value);
        v = data;
    }
    break;
    case TypeInt64:
    {
        char data[255];
        snprintf(data, sizeof(data), "%lld", _int64Value);
        v = data;
    }
    break;
    case TypeUint32:
    {
        char data[255];
        snprintf(data, sizeof(data), "%u", _uint32Value);
        v = data;
    }
    break;
    case TypeUint64:
    {
        char data[255];
        snprintf(data, sizeof(data), "%llu", _uint64Value);
        v = data;
    }
    break;
    case TypeBoolean:
        if (_booleanValue)
        {
            v = "true";
        }
        else
        {
            v = "false";
        }
        break;
    case TypeNumber:
    {
        char data[255];
        snprintf(data, sizeof(data), "%g", _numberValue);
        v = data;
    }
    break;
    case TypeString:
        return _stringValue;
    default:
        break;
    }
    return v;
}

Any::operator kk::IObject *()
{
    if (_type == TypeObject)
    {
        return _objectValue;
    }
    return nullptr;
}

Any::operator kk::_Closure *()
{
    if (_type == TypeFunction)
    {
        return _functionValue;
    }
    return nullptr;
}

Any Any::Nil;

String::String()
{
}

String::String(std::string &v) : std::string(v)
{
}

String::String(const char *v) : std::string(v)
{
}

String::String(const String &v) : std::string(v)
{
}

String &String::operator=(const char *v)
{
    std::string::operator=(v);
    return *this;
}

String &String::operator=(Boolean v)
{
    std::string::operator=(v ? "true" : "false");
    return *this;
}
String &String::operator=(Number v)
{
    char data[255];
    snprintf(data, sizeof(data), "%g", v);
    std::string::operator=(data);
    return *this;
}
String &String::operator=(IObject *v)
{
    std::string::operator=("");
    return *this;
}
String &String::operator=(Int32 v)
{
    char data[255];
    snprintf(data, sizeof(data), "%d", v);
    std::string::operator=(data);
    return *this;
}
String &String::operator=(Uint32 v)
{
    char data[255];
    snprintf(data, sizeof(data), "%u", v);
    std::string::operator=(data);
    return *this;
}
String &String::operator=(Int64 v)
{
    char data[255];
    snprintf(data, sizeof(data), "%lld", v);
    std::string::operator=(data);
    return *this;
}
String &String::operator=(Uint64 v)
{
    char data[255];
    snprintf(data, sizeof(data), "%llu", v);
    std::string::operator=(data);
    return *this;
}
String String::operator+(const char *b)
{   
    String v(*this);
    v.append(b);
    return v;
}
String String::operator+(const String &b)
{
    String v(*this);
    v.append(b);
    return v;
}
String String::operator+(Int32 b) {
    char data[255];
    snprintf(data, sizeof(data), "%d", b);
    String v(*this);
    v.append(data);
    return v;
}
String String::operator+(Int64 b) {
    char data[255];
    snprintf(data, sizeof(data), "%lld", b);
    String v(*this);
    v.append(data);
    return v;
}
String String::operator+(Uint32 b) {
    char data[255];
    snprintf(data, sizeof(data), "%u", b);
    String v(*this);
    v.append(data);
    return v;
}
String String::operator+(Uint64 b) {
    char data[255];
    snprintf(data, sizeof(data), "%llu", b);
    String v(*this);
    v.append(data);
    return v;
}

class MutexAtomic : public Atomic
{
  public:
    MutexAtomic()
    {
        pthread_mutex_init(&_lock, nullptr);
        pthread_mutex_init(&_objectLock, nullptr);
    }

    virtual ~MutexAtomic()
    {
        pthread_mutex_destroy(&_lock);
        pthread_mutex_destroy(&_objectLock);
    }

    virtual void lock()
    {
        pthread_mutex_lock(&_lock);
    }

    virtual void unlock()
    {
        pthread_mutex_unlock(&_lock);

        IObject *v = nullptr;

        do
        {

            pthread_mutex_lock(&_objectLock);

            if (_objects.empty())
            {
                v = nullptr;
            }
            else
            {
                v = _objects.front();
                _objects.pop();
            }

            pthread_mutex_unlock(&_objectLock);

            if (v != nullptr && v->retainCount() == 0)
            {
                delete (_Object *)v;
            }

        } while (v);
    }

    virtual void addObject(IObject *object)
    {
        pthread_mutex_lock(&_objectLock);
        _objects.push(object);
        pthread_mutex_unlock(&_objectLock);
    }

  private:
    pthread_mutex_t _lock;
    pthread_mutex_t _objectLock;
    std::queue<IObject *> _objects;
};

Atomic *atomic()
{

    static Atomic *a = nullptr;

    if (a == nullptr)
    {
        a = new MutexAtomic();
    }

    return a;
}

} // namespace kk
